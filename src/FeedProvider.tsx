/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — FeedProvider

   Owns: items, paging, the rotation seed, the active index, the mount
   window. Owns no DOM.

   Step 1 scope. Save/pass state arrives in step 4.
   ══════════════════════════════════════════════════════════════════════ */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FeedConfig, FeedItem, FeedTheme } from './types';
import { themes } from './theme';
import { useDecisions, type Decisions } from './useDecisions';
import { useOrigin, type OriginState } from './useOrigin';

/** Cards mounted either side of the active one. 2 back + current + 2 forward. */
export const MOUNT_RADIUS = 2;

/** Start fetching the next page this many cards from the end. */
const PREFETCH_MARGIN = 3;

type Status = 'loading' | 'ready' | 'empty' | 'error';

interface FeedState {
  items: FeedItem[];
  total: number;
  status: Status;
  activeIndex: number;
  theme: FeedTheme;
  config: FeedConfig;
  /** Count at the next band out, when the server sent one. */
  widerTotal?: number;
  setActiveIndex: (i: number) => void;
  isMounted: (i: number) => boolean;
  retry: () => void;
  decisions: Decisions;
  origin: OriginState;
  /** A distance was asked for and we have nothing to measure from. */
  needsOrigin: boolean;
}

const Ctx = createContext<FeedState | null>(null);

export function useFeed(): FeedState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeed must be used inside <FeedProvider>');
  return v;
}

export function FeedProvider({
  config,
  children,
}: {
  config: FeedConfig;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [widerTotal, setWiderTotal] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Status>('loading');
  const [activeIndex, setActiveIndex] = useState(0);

  /* The seed is issued by the server on the first page and echoed back on
     every subsequent one. Without this the server reshuffles between pages
     and the same person appears twice — the single most visible way for a
     feed to look broken. */
  const seed = useRef<number | null>(null);
  const cursor = useRef<string | null>(null);
  /* Passes from previous sessions. Filtered out as pages arrive, never
     live — see the snapshot rule in useDecisions. */
  const hidden = useRef<Set<string>>(new Set());
  /* loadPage is memoised on config; the origin is read through a ref so a
     new fix does not rebuild the fetcher mid-page. */
  const originRef = useRef<{ lat: number; lng: number } | null>(null);

  const origin = useOrigin(config.product);

  /* A specific band with no origin has nothing to measure from. The
     server correctly returns nothing rather than widening, so the client
     must ask before it asks the server. */
  const needsOrigin = config.band !== 'anywhere' && !origin.origin;

  useEffect(() => {
    originRef.current = origin.origin
      ? { lat: origin.origin.lat, lng: origin.origin.lng }
      : null;
  }, [origin.origin]);

  const exhausted = useRef(false);
  const inFlight = useRef(false);

  const loadPage = useCallback(async () => {
    if (inFlight.current || exhausted.current) return;
    inFlight.current = true;
    try {
      const page = await config.fetchPage({
        band: config.band,
        cursor: cursor.current,
        seed: seed.current,
        /* Never sent for `anywhere` — there is nothing to measure. */
        origin:
          config.band === 'anywhere' || !originRef.current
            ? null
            : { lat: originRef.current.lat, lng: originRef.current.lng },
      });

      if (seed.current === null) seed.current = page.seed;
      cursor.current = page.nextCursor;
      if (!page.nextCursor) exhausted.current = true;

      setTotal(page.total);
      if (typeof page.widerTotal === 'number') setWiderTotal(page.widerTotal);
      setItems((prev) => {
        /* Defensive dedupe. If the server ever ignores the seed, this stops
           a duplicate rendering — but it is a symptom, not a fix. */
        const seen = new Set(prev.map((i) => i.id));
        const fresh = page.items.filter(
          (i) => !seen.has(i.id) && !hidden.current.has(i.id)
        );
        const next = [...prev, ...fresh];
        setStatus(next.length ? 'ready' : 'empty');
        return next;
      });
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'));
    } finally {
      inFlight.current = false;
    }
  }, [config]);

  /* Reset everything when the band changes. A new band is a new feed:
     new seed, new cursor, back to the top. */
  useEffect(() => {
    seed.current = null;
    cursor.current = null;
    exhausted.current = false;
    setItems([]);
    setTotal(0);
    setWiderTotal(undefined);
    setActiveIndex(0);
    setStatus('loading');
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.band, config.product, origin.origin?.lat, origin.origin?.lng]);

  /* Prefetch as the active card approaches the end. */
  useEffect(() => {
    if (status !== 'ready') return;
    if (activeIndex >= items.length - PREFETCH_MARGIN) void loadPage();
  }, [activeIndex, items.length, status, loadPage]);

  const isMounted = useCallback(
    (i: number) => Math.abs(i - activeIndex) <= MOUNT_RADIUS,
    [activeIndex]
  );

  const retry = useCallback(() => {
    exhausted.current = false;
    setStatus('loading');
    void loadPage();
  }, [loadPage]);

  /* Flush clears passes and starts the feed again from the top. It is an
     explicit action from the end card, so a reset is expected — unlike a
     live filter, which would move the ground under someone mid-scroll. */
  const onFlush = useCallback(() => {
    hidden.current = new Set();
    seed.current = null;
    cursor.current = null;
    exhausted.current = false;
    setItems([]);
    setActiveIndex(0);
    setStatus('loading');
    void loadPage();
    document.querySelector('[data-index="0"]')?.scrollIntoView({ block: 'start' });
  }, [loadPage]);

  const decisions = useDecisions(config.product, onFlush);

  /* Keep the page filter in step with the session snapshot. */
  useEffect(() => {
    hidden.current = decisions.hiddenIds;
  }, [decisions.hiddenIds]);

  const value = useMemo<FeedState>(
    () => ({
      items,
      total,
      status,
      activeIndex,
      theme: themes[config.product],
      config,
      widerTotal,
      setActiveIndex,
      isMounted,
      retry,
      decisions,
      origin,
      needsOrigin,
    }),
    [items, total, widerTotal, status, activeIndex, config, isMounted, retry, decisions, origin, needsOrigin]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
