/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — MediaStage

   Step 2 scope: photographs, the segmented progress bar, tap to advance.

   Video segments are modelled here from the start — they render their
   poster and carry the notch that marks them as video — but playback,
   autoplay policy and the sound rule land in step 6. Building the
   segment model photo-only and bolting video on later is how the
   progress bar ends up with two incompatible notions of "duration".
   ══════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItem } from './types';
import { VideoFrame, SoundButton, type AutoplayPref } from './VideoFrame';

export interface MediaStageProps {
  media: MediaItem[];
  /** This card is the current snap target. */
  active: boolean;
  /** This card is inside the mount window. Media only renders when true. */
  mounted: boolean;
  /** Eager-load the cover — used for the active card and its neighbours. */
  eager?: boolean;
  /** Show the bar even for a single item. Creator sets this. */
  showSingleSegment?: boolean;
  /** Long-press / name tap target. */
  onOpen?: () => void;
  /** Autoplay preference from the settings sheet. */
  autoplayPref?: AutoplayPref;
}

export function MediaStage({
  media,
  active,
  mounted,
  eager = false,
  showSingleSegment = false,
  onOpen,
  autoplayPref = 'wifi',
}: MediaStageProps) {
  const [index, setIndex] = useState(0);
  /* 0…1 for the current video segment, driven from the video clock. */
  const [vidProgress, setVidProgress] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const fadeTimer = useRef<number | null>(null);

  const count = media.length;
  const current = media[index];

  /* ── reset rule ────────────────────────────────────────────────────
     The segment resets when the card leaves the mount window, not when
     it merely stops being active. Scrolling one card past and back is a
     common accident and should return you where you were; genuinely
     leaving and coming back should start at the cover, which is the best
     first frame she has.
     ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mounted) {
      setIndex(0);
      setPrevious(null);
      setVidProgress(0);
    }
  }, [mounted]);

  /* Each segment starts its own clock. */
  useEffect(() => setVidProgress(0), [index]);

  const goto = useCallback(
    (next: number) => {
      if (count <= 1) return;
      const wrapped = ((next % count) + count) % count;
      setIndex((cur) => {
        if (wrapped === cur) return cur;
        setPrevious(cur);
        if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
        fadeTimer.current = window.setTimeout(() => setPrevious(null), 160);
        return wrapped;
      });
    },
    [count]
  );

  useEffect(
    () => () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    },
    []
  );

  /* Keyboard equivalents. Every gesture needs one. */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goto(index + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goto(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, index, goto]);

  /* Preload the next photo in this set once the card is active. Within a
     card only — the next card's cover is handled by the viewport, and
     nothing preloads video for a segment nobody has reached. */
  useEffect(() => {
    if (!active || count <= 1) return;
    const next = media[(index + 1) % count];
    /* Photos only. Nothing preloads video for a segment nobody has
       reached — see the decoder budget in VideoFrame. */
    if (!next || next.type !== 'photo') return;
    const img = new Image();
    img.src = next.url;
  }, [active, index, count, media]);

  if (!mounted) return <div className="fd__holding" />;
  if (!current) return <div className="fd__holding" />;

  const showBar = count > 1 || showSingleSegment;

  return (
    <>
      <div className="fd__media">
        {previous !== null && media[previous] ? (
          <Frame item={media[previous]!} eager fading />
        ) : null}

        {current.type === 'video' ? (
          <VideoFrame
            item={current}
            active={active}
            current
            pref={autoplayPref}
            onProgress={setVidProgress}
          />
        ) : (
          <Frame item={current} eager={eager || active} />
        )}
      </div>

      {showBar ? (
        <div className="fd__segs" aria-hidden="true">
          {media.map((m, i) => (
            <span
              key={i}
              className={
                'fd__seg' +
                (i < index ? ' is-done' : '') +
                (i === index ? ' is-now' : '') +
                (m.type === 'video' ? ' is-video' : '')
              }
            >
              {/* Only a playing video fills its segment. A photo segment is
                  filled or not — it has no duration, because it waits. */}
              {i === index && m.type === 'video' ? (
                <b style={{ transform: `scaleX(${vidProgress})` }} />
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {/* Tap zones. They sit above the media and below the card body, so a
          tap on the name or the buttons never advances a photograph. */}
      {count > 1 ? (
        <div className="fd__taps">
          {/* data-drag-ok: the tap zones cover most of the card, so the
              gesture layer must still be allowed to start a drag on them.
              Without it, horizontal swipe only works on the bottom third. */}
          <button
            className="fd__tap fd__tap--prev"
            onClick={() => goto(index - 1)}
            data-drag-ok
            aria-label="Previous photo"
            tabIndex={-1}
          />
          <button
            className="fd__tap fd__tap--next"
            onClick={() => goto(index + 1)}
            data-drag-ok
            aria-label="Next photo"
            tabIndex={-1}
          />
        </div>
      ) : null}

      {/* Only ever on a video segment. A mute control on a photograph is
          noise, and it would sit there the whole time on cards with no
          video at all. */}
      {current.type === 'video' ? (
        <div className="fd__soundwrap">
          <SoundButton />
        </div>
      ) : null}

      <span className="fd__sr" aria-live="polite">
        {active && count > 1 ? `Photo ${index + 1} of ${count}` : ''}
      </span>

      {onOpen ? (
        <button className="fd__sr" onClick={onOpen}>
          Open profile
        </button>
      ) : null}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function Frame({
  item,
  eager,
  fading = false,
}: {
  item: MediaItem;
  eager: boolean;
  fading?: boolean;
}) {
  /* A video segment shows its poster here. Playback is step 6. The poster
     is mandatory on upload precisely so this frame is never empty. */
  const src = item.type === 'video' ? item.poster ?? item.url : item.url;

  /* Dimensions are optional — the provider tile does not send them yet.
     Given, they reserve the box before the bytes land; missing, the
     card's own 9:16 frame holds the space. Never pass width/height as
     undefined attributes: React drops them, but an explicit 0 would
     collapse the image. */
  const dims =
    typeof item.width === 'number' && typeof item.height === 'number'
      ? { width: item.width, height: item.height }
      : {};

  return (
    <img
      className={'fd__frame' + (fading ? ' is-fading' : '')}
      src={src}
      alt=""
      {...dims}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      draggable={false}
    />
  );
}
