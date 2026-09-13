/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — GestureLayer

   Step 3. The hard one: a horizontal drag handler that shares a card with
   a native vertical scroll-snap container without either fighting the
   other.

   How the two coexist
   ───────────────────
   `touch-action: pan-y` on the card is the whole trick. It tells the
   browser: you keep vertical panning, I will handle horizontal myself.
   The browser then never starts a horizontal pan, and we never have to
   cancel a scroll that has already begun — which is impossible on touch
   once it starts.

   When the browser does claim the gesture as a vertical scroll it sends
   us `pointercancel`. That is the signal to drop the drag, and handling
   it is the difference between a card that snaps back cleanly and one
   that sticks half-dragged after a fast scroll.
   ══════════════════════════════════════════════════════════════════════ */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/** Commit at a quarter of the viewport... */
const COMMIT_RATIO = 0.25;
/** ...or on a flick, whatever the distance. */
const COMMIT_VELOCITY = 0.5; // px per ms
/** Movement before an axis locks. Below this it could still be either. */
const AXIS_LOCK = 10;
/** Drag past the commit point gets stiff, so a card never flies off. */
const RESISTANCE = 0.35;

export type CardAction = 'save' | 'pass';

interface CardActions {
  save: () => void;
  pass: () => void;
  open: () => void;
  /** -1…1. Product components can use it to fade their own content. */
  progress: number;
}

const ActionCtx = createContext<CardActions | null>(null);

/** For product-supplied action rows, so a button and a swipe do the same thing. */
export function useCardActions(): CardActions {
  const v = useContext(ActionCtx);
  if (!v) throw new Error('useCardActions must be used inside a feed card');
  return v;
}

export interface GestureLayerProps {
  active: boolean;
  onSave: () => void;
  onPass: () => void;
  onOpen: () => void;
  /** Move to the next card after a committed decision. */
  onAdvance: () => void;
  children: React.ReactNode;
}

export function GestureLayer({
  active,
  onSave,
  onPass,
  onOpen,
  onAdvance,
  children,
}: GestureLayerProps) {
  const el = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);

  /* A drag that moved is not a tap. Without suppressing the click that
     follows, every swipe also advances a photograph on release. */
  const suppressTap = useRef(false);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const axis = useRef<'none' | 'x' | 'y'>('none');
  const last = useRef<{ x: number; t: number } | null>(null);
  const velocity = useRef(0);

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Measure the card, never the window. On desktop the card is a ~440px
     column inside a wide page — a threshold based on window width would
     make a swipe there need three times the travel it needs on a phone. */
  const width = useCallback(
    () => el.current?.offsetWidth || (typeof window !== 'undefined' ? window.innerWidth : 1),
    []
  );

  const reset = useCallback(() => {
    start.current = null;
    axis.current = 'none';
    last.current = null;
    velocity.current = 0;
  }, []);

  const springBack = useCallback(() => {
    setSettling(true);
    setDx(0);
    window.setTimeout(() => setSettling(false), reduced ? 0 : 220);
  }, [reduced]);

  const commit = useCallback(
    (action: CardAction) => {
      /* Haptic on save only. A pass is a non-event and should not buzz. */
      if (action === 'save' && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(10);
        } catch {
          /* ignore */
        }
      }

      if (action === 'save') onSave();
      else onPass();

      /* The card is never removed. It lives inside a scroll-snap list, and
         removing an element mid-scroll changes the geometry under the
         person's thumb — the scroll jumps and they lose their place. Spring
         it back and move on instead. */
      springBack();
      window.setTimeout(onAdvance, reduced ? 0 : 120);
    },
    [onSave, onPass, onAdvance, springBack, reduced]
  );

  /* ── pointer handling ─────────────────────────────────────────────── */

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active) return;
    /* Never start a drag from a control. A button press that also nudges
       the card reads as broken.

       The media tap zones are the exception — they cover most of the card
       and are marked `data-drag-ok`, or horizontal swipe would only work
       on the bottom third. */
    const t = e.target as HTMLElement;
    const ctl = t.closest('button, a, input, [data-no-drag]');
    if (ctl && !ctl.hasAttribute('data-drag-ok')) return;

    start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    last.current = { x: e.clientX, t: e.timeStamp };
    axis.current = 'none';
    setSettling(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;

    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;

    if (axis.current === 'none') {
      if (Math.abs(mx) < AXIS_LOCK && Math.abs(my) < AXIS_LOCK) return;
      /* Locks once and does not change for the rest of the gesture, so a
         diagonal drag never does both. */
      axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (axis.current === 'x') el.current?.setPointerCapture?.(e.pointerId);
    }

    if (axis.current !== 'x') return;

    if (last.current) {
      const dt = e.timeStamp - last.current.t;
      if (dt > 0) velocity.current = (e.clientX - last.current.x) / dt;
    }
    last.current = { x: e.clientX, t: e.timeStamp };

    const limit = width() * COMMIT_RATIO;
    const over = Math.abs(mx) - limit;
    const eased =
      over > 0 ? Math.sign(mx) * (limit + over * RESISTANCE) : mx;
    setDx(eased);
  };

  const onPointerUp = () => {
    if (axis.current !== 'x' || !start.current) {
      reset();
      return;
    }
    suppressTap.current = true;
    window.setTimeout(() => (suppressTap.current = false), 0);

    const limit = width() * COMMIT_RATIO;
    const far = Math.abs(dx) >= limit;
    const fast = Math.abs(velocity.current) >= COMMIT_VELOCITY;

    if (far || fast) commit(dx > 0 ? 'save' : 'pass');
    else springBack();

    reset();
  };

  /* The browser claimed the gesture as a vertical scroll. Let it go. */
  const onPointerCancel = () => {
    if (axis.current === 'x') springBack();
    reset();
  };

  /* ── keyboard ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        commit('save');
      } else if (k === 'x') {
        e.preventDefault();
        commit('pass');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, commit, onOpen]);

  /* ── render ───────────────────────────────────────────────────────── */

  const limit = width() * COMMIT_RATIO;
  const progress = Math.max(-1, Math.min(1, dx / limit));

  const actions: CardActions = {
    save: () => commit('save'),
    pass: () => commit('pass'),
    open: onOpen,
    progress,
  };

  return (
    <ActionCtx.Provider value={actions}>
      <div
        ref={el}
        className={'fd__drag' + (settling ? ' is-settling' : '')}
        style={{ transform: dx ? `translate3d(${dx}px,0,0)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={(e) => {
          if (suppressTap.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {children}

        {/* Stamps track the drag, so the outcome is visible before release.
            Nothing commits on a drag that springs back. */}
        <span
          className="fd__stamp fd__stamp--save"
          style={{ opacity: Math.max(0, progress) }}
          aria-hidden="true"
        >
          Saved
        </span>
        <span
          className="fd__stamp fd__stamp--pass"
          style={{ opacity: Math.max(0, -progress) }}
          aria-hidden="true"
        >
          Pass
        </span>
      </div>
    </ActionCtx.Provider>
  );
}
