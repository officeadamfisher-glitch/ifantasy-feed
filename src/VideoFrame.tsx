/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — VideoFrame

   Step 6. Playback for a video segment.

   Four rules from the spec, all enforced here rather than trusted to a
   caller:

   1. Autoplays muted, and LOOPS. It never advances the segment on its
      own — auto-advance rushes a decision the person is still making.

   2. Sound is off on every fresh session and the choice never persists.
      Session memory only. Someone who turns sound on at home and is
      outed on a bus three weeks later was failed by the software, so
      this is a safety rule wearing the clothes of a preference.

   3. No autoplay on a metered or slow connection, or under reduced
      motion. Poster frame and a play button instead.

   4. Exactly one video element is ever playing. The card that is the
      current snap target, and nothing else.
   ══════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import type { MediaItem } from './types';

/* ── session-only sound ────────────────────────────────────────────────
   A module-level variable, deliberately. Not localStorage, not the
   account, not sessionStorage — a fresh tab is a fresh decision.
   ──────────────────────────────────────────────────────────────────── */
let soundOn = false;
const soundListeners = new Set<(on: boolean) => void>();

export function isSoundOn(): boolean {
  return soundOn;
}

export function setSoundOn(on: boolean): void {
  soundOn = on;
  soundListeners.forEach((fn) => fn(on));
}

export function useSound(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(soundOn);
  useEffect(() => {
    soundListeners.add(setOn);
    return () => {
      soundListeners.delete(setOn);
    };
  }, []);
  return [on, setSoundOn];
}

/* ── autoplay policy ──────────────────────────────────────────────── */

export type AutoplayPref = 'wifi' | 'never';

interface Conn {
  saveData?: boolean;
  effectiveType?: string;
}

export function canAutoplay(pref: AutoplayPref): boolean {
  if (pref === 'never') return false;
  if (typeof window === 'undefined') return false;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const conn = (navigator as unknown as { connection?: Conn }).connection;
  if (conn?.saveData) return false;

  /* Unknown counts as fine — most desktop browsers report nothing, and
     refusing to play there would be worse than the occasional wrong
     guess on a phone. */
  const t = conn?.effectiveType;
  if (t && t !== '4g') return false;

  return true;
}

/* ════════════════════════════════════════════════════════════════════ */

export interface VideoFrameProps {
  item: MediaItem;
  /** This card is the current snap target. */
  active: boolean;
  /** This segment is the one being shown. */
  current: boolean;
  pref: AutoplayPref;
  /** 0…1, driven from the video's own clock, for the segment bar. */
  onProgress?: (p: number) => void;
}

export function VideoFrame({
  item,
  active,
  current,
  pref,
  onProgress,
}: VideoFrameProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound] = useSound();
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  const live = active && current;
  const auto = canAutoplay(pref);

  /* ── the decoder budget ───────────────────────────────────────────
     One element playing, always. Everything else is paused and rewound,
     and `preload="none"` means a card two away has downloaded nothing.
     Get this wrong and the phone gets hot, the battery goes, and on
     cellular it is someone else's money.
     ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    if (!live) {
      v.pause();
      /* Rewound, so returning starts the clip rather than resuming
         halfway through something nobody chose to leave. */
      try {
        v.currentTime = 0;
      } catch {
        /* not seekable yet */
      }
      setBlocked(false);
      return;
    }

    if (!auto) {
      setBlocked(true);
      return;
    }

    const p = v.play();
    if (p && typeof p.catch === 'function') {
      /* Safari and Chrome both reject when they decide the gesture
         history does not justify playback. Not an error — show the
         poster and let them tap. */
      p.then(() => setBlocked(false)).catch(() => setBlocked(true));
    }
  }, [live, auto]);

  /* Muting is separate from playing: toggling sound must never restart
     the clip. */
  useEffect(() => {
    const v = ref.current;
    if (v) v.muted = !sound;
  }, [sound, live]);

  /* Segment fill, from the video's own clock rather than a timer — a
     timer drifts against a buffering video and the bar ends up lying. */
  useEffect(() => {
    const v = ref.current;
    if (!v || !live || !onProgress) return;

    let raf = 0;
    const tick = () => {
      const d = v.duration || (item.durationMs ? item.durationMs / 1000 : 0);
      if (d > 0) onProgress(Math.min(1, v.currentTime / d));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, onProgress, item.durationMs]);

  const tapToPlay = () => {
    const v = ref.current;
    if (!v) return;
    v.play()
      .then(() => setBlocked(false))
      .catch(() => setFailed(true));
  };

  return (
    <>
      <video
        ref={ref}
        className="fd__frame fd__video"
        src={live || active ? item.url : undefined}
        poster={item.poster}
        muted={!sound}
        loop
        playsInline
        /* Nothing downloads for a segment nobody has reached. */
        preload="none"
        disablePictureInPicture
        controls={false}
        onError={() => setFailed(true)}
        aria-hidden="true"
      />

      {/* Poster stays visible behind a blocked or failed video, so the
          frame is never empty. It is mandatory on upload for exactly
          this. */}
      {(blocked || failed) && item.poster ? (
        <img className="fd__frame fd__poster" src={item.poster} alt="" />
      ) : null}

      {blocked && !failed ? (
        <div className="fd__playwrap">
          <button className="fd__play" onClick={tapToPlay} aria-label="Play video">
            &#9654;
          </button>
          {!auto ? (
            <p className="fd__savedata">Video paused to save data. Tap to play.</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export function SoundButton() {
  const [sound, set] = useSound();
  return (
    <button
      className={'fd__sound' + (sound ? ' is-on' : '')}
      onClick={() => set(!sound)}
      aria-pressed={sound}
      aria-label={sound ? 'Mute' : 'Unmute'}
      data-no-drag
    >
      {sound ? '\u266A' : '\u2298'}
    </button>
  );
}
