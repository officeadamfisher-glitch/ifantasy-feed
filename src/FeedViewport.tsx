/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — FeedViewport + FeedCard

   The scroll-snap container and the card shell.

   Vertical movement is native CSS scroll-snap, not JavaScript. It is
   smoother, interruptible, and gets momentum scrolling for free. The
   horizontal gesture layer (step 3) sits on top and only cancels the
   snap once an axis has locked horizontal.
   ══════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFeed } from './FeedProvider';
import { MediaStage } from './MediaStage';
import { GestureLayer } from './GestureLayer';
import { EndCard, EmptyCard, ErrorCard } from './EndCard';
import { LocationGate } from './LocationGate';
import { SettingsSheet, CoachOverlay, useCoach } from './SettingsSheet';
import { keys, readValue, writeValue } from './storage';
import type { AutoplayPref } from './VideoFrame';
import { themeVars } from './theme';
import type { FeedItem } from './types';

export interface FeedSlots {
  /** Bottom-left card content — name, bio, tags, or caption. */
  renderBody: (item: FeedItem, isActive: boolean) => React.ReactNode;
  /** Top-row content to the left of the spacer — distance chip, avatar row. */
  renderHeader?: (item: FeedItem, isActive: boolean) => React.ReactNode;
  /** The end of the feed. */
  renderEnd?: (total: number) => React.ReactNode;
  /** Show the segment bar even for a single media item. Creator sets this. */
  showSingleSegment?: boolean;
  /** Opening a profile or post. */
  onOpen?: (item: FeedItem) => void;
  /** A committed save. Persistence lands in step 4. */
  onSave?: (item: FeedItem) => void;
  /** A committed pass. Device-local only — never sent to a server. */
  onPass?: (item: FeedItem) => void;
}

export function FeedViewport({ slots }: { slots: FeedSlots }) {
  const {
    items,
    total,
    status,
    activeIndex,
    setActiveIndex,
    theme,
    config,
    origin,
    needsOrigin,
  } = useFeed();
  const scroller = useRef<HTMLDivElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [coach, coachDone] = useCoach();
  const [autoplay, setAutoplayState] = useState<AutoplayPref>('wifi');

  useEffect(() => {
    const v = readValue(keys.autoplay(config.product));
    if (v === 'never' || v === 'wifi') setAutoplayState(v);
  }, [config.product]);

  const setAutoplay = (p: AutoplayPref) => {
    setAutoplayState(p);
    writeValue(keys.autoplay(config.product), p);
  };
  const style = useMemo(
    () => themeVars(theme) as React.CSSProperties,
    [theme]
  );

  /* Active card detection.
     IntersectionObserver against the scroller, not a scroll handler. A
     scroll handler fires on every frame and forces layout; the observer
     fires once per crossing and costs nothing. */
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.index);
          if (!Number.isNaN(i)) setActiveIndex(i);
        }
      },
      { root, threshold: 0.6 }
    );

    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length, setActiveIndex]);

  if (status === 'loading' && !items.length) {
    return (
      <div className="fd" style={style}>
        <div className="fd__stage">
          <div className="fd__viewport" aria-busy="true" />
        </div>
      </div>
    );
  }

  /* No feed to scroll. A single screen, not a list with one odd card in
     it — and never a 404 or a blank, both of which read as broken rather
     than as a standard being kept. */
  if (!items.length) {
    return (
      <div className="fd" style={style}>
        <a className="fd__close" href={config.directoryUrl}>
          <span aria-hidden="true">&larr;</span> Back to the directory
        </a>
        <div className="fd__stage">
          <div className="fd__viewport">
            <div className="fd__end">
              {status === 'error' ? <ErrorCard /> : <EmptyCard />}
            </div>
          </div>
          <ExitButton url={config.exitUrl} />
        </div>
      </div>
    );
  }

  return (
    <div className="fd" style={style}>
      <h1 className="fd__sr">Verified people near you</h1>

      {/* Desktop only. Returns to the directory — this is not the quick
          exit and the two must never be conflated. */}
      <a className="fd__close" href={config.directoryUrl}>
        <span aria-hidden="true">&larr;</span> Back to the directory
      </a>

      <div className="fd__stage">
      <div
        className="fd__viewport"
        ref={scroller}
        role="list"
        aria-label="Feed"
      >
        {items.map((item, i) => (
          <FeedCard
            key={item.id}
            item={item}
            index={i}
            count={items.length}
            slots={slots}
            autoplay={autoplay}
          />
        ))}

        <div className="fd__end" data-index={items.length}>
          {slots.renderEnd?.(total) ?? <EndCard />}
        </div>
      </div>

      <SavedNotice />
      <ExitButton url={config.exitUrl} />

      <button
        className="fd__cog"
        onClick={() => setSheetOpen(true)}
        aria-label="Feed settings"
        data-no-drag
      >
        &#9881;
      </button>

      {sheetOpen ? (
        <SettingsSheet
          onClose={() => setSheetOpen(false)}
          autoplay={autoplay}
          onAutoplay={setAutoplay}
          onChangeLocation={() => {
            setSheetOpen(false);
            setGateOpen(true);
          }}
        />
      ) : null}

      {/* Only ever shown because someone asked for a distance, or asked to
          change it from settings. Never on load — see useOrigin. */}
      {needsOrigin || gateOpen ? (
        <LocationGate
          state={origin}
          cities={config.cities ?? []}
          onAnywhere={() => {
            config.onBandChange?.('anywhere');
            setGateOpen(false);
          }}
          onClose={gateOpen && !needsOrigin ? () => setGateOpen(false) : undefined}
        />
      ) : null}

      {/* Last, so it sits over everything on a first visit. */}
      {coach ? <CoachOverlay onDone={coachDone} /> : null}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function FeedCard({
  item,
  index,
  count,
  slots,
  autoplay,
}: {
  item: FeedItem;
  index: number;
  count: number;
  slots: FeedSlots;
  autoplay: AutoplayPref;
}) {
  const { activeIndex, isMounted, decisions } = useFeed();
  const active = index === activeIndex;
  const mounted = isMounted(index);
  const passed = decisions.isPassed(item.id);

  const open = () => slots.onOpen?.(item);

  /* Advance by scrolling the next card into view rather than by setting
     state. The scroll container is the source of truth for position —
     two sources would disagree the moment someone scrolls during the
     animation. */
  const advance = () => {
    const next = document.querySelector<HTMLElement>(
      `[data-index="${index + 1}"]`
    );
    if (!next) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  /* Every card stays in the DOM so the scroll geometry is real — swapping
     cards for spacers makes the scrollbar jump and breaks snap points on
     fast flicks. Only the media inside the mount window renders. */
  return (
    <article
      className="fd__card"
      data-index={index}
      role="listitem"
      aria-setsize={count}
      aria-posinset={index + 1}
    >
      <GestureLayer
        active={active}
        onSave={() => {
          decisions.save(item.id);
          slots.onSave?.(item);
        }}
        onPass={() => {
          decisions.pass(item.id);
          /* Deliberately no product callback for a pass. Nothing about a
             pass is reported anywhere — see useDecisions. */
        }}
        onOpen={open}
        onAdvance={advance}
      >
        <MediaStage
          media={item.media}
          active={active}
          mounted={mounted}
          /* The active card and its immediate neighbour load eagerly so a
             flick never lands on an empty frame. Everything else is lazy. */
          eager={Math.abs(index - activeIndex) <= 1}
          showSingleSegment={slots.showSingleSegment}
          onOpen={slots.onOpen ? open : undefined}
          autoplayPref={autoplay}
        />

        <div className="fd__scrim" />

        <div className="fd__top">
          {slots.renderHeader?.(item, active)}
          <span className="fd__spacer" />
        </div>

        <div className="fd__body">{slots.renderBody(item, active)}</div>

        {/* A card passed during this session stays where it is, marked and
            undoable. Removing it would change the scroll geometry under
            the person's thumb. It simply does not come back next time. */}
        {passed ? (
          <div className="fd__passed">
            <span>Passed</span>
            <button
              className="fd__undo"
              data-no-drag
              onClick={() => decisions.undoPass(item.id)}
            >
              Undo
            </button>
          </div>
        ) : null}
      </GestureLayer>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function SavedNotice() {
  const { decisions } = useFeed();
  if (!decisions.showSavedNotice) return null;

  return (
    <div className="fd__notice" role="status">
      <div>
        <b>
          {decisions.ephemeral
            ? 'Saved for this visit only'
            : 'Saved to this device'}
        </b>
        <p>
          {decisions.ephemeral
            ? 'Private browsing means these will not be here when you close the tab.'
            : 'Sign in when accounts open and we will keep them.'}
        </p>
      </div>
      <button
        className="fd__notice-x"
        onClick={decisions.dismissSavedNotice}
        aria-label="Dismiss"
      >
        &#10005;
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function ExitButton({ url = 'https://www.google.co.uk' }: { url?: string }) {
  /* Replace, never assign — assign leaves this page in history and the back
     button returns to it, which defeats the entire point. Never tracked: a
     record of who fled and when hurts someone if it leaks. */
  const leave = () => {
    try {
      window.history.replaceState(null, '', url);
    } catch {
      /* ignore */
    }
    window.location.replace(url);
  };

  useEffect(() => {
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      /* Twice within a second. A single Escape closes menus and sheets
         everywhere else and would eject people by accident. */
      if (now - last < 1000) leave();
      last = now;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <button
      className="fd__exit"
      onClick={leave}
      aria-label="Quick exit — leave this site immediately"
    >
      Exit
    </button>
  );
}
