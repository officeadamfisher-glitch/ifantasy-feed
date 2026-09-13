/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — SettingsSheet + CoachOverlay

   Everything the feed can be told to do, in one bottom sheet, plus the
   one-time gesture teaching.
   ══════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import { useFeed } from './FeedProvider';
import { setSurface } from './routing';
import { keys, readFlag, writeFlag } from './storage';
import type { AutoplayPref } from './VideoFrame';
import type { DistanceBand } from './types';

const BANDS: DistanceBand[] = [
  'under 1 mile',
  'under 5 miles',
  'under 10 miles',
  'anywhere',
];

/* ════════════════════════════════════════════════════════════════════ */

export function SettingsSheet({
  onClose,
  autoplay,
  onAutoplay,
  onChangeLocation,
}: {
  onClose: () => void;
  autoplay: AutoplayPref;
  onAutoplay: (p: AutoplayPref) => void;
  onChangeLocation: () => void;
}) {
  const { config, decisions, origin } = useFeed();

  /* Escape closes. A sheet with no keyboard exit is a trap on desktop. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toDirectory = () => {
    /* Sticks. The person has chosen, and the device default stops
       overriding them until they switch back. */
    setSurface(config.product, 'directory');
    window.location.assign(config.directoryUrl);
  };

  return (
    <div className="fd__sheet" role="dialog" aria-modal="true" aria-label="Feed settings">
      <button className="fd__scrimbtn" onClick={onClose} aria-label="Close" />

      <div className="fd__sheetpanel">
        <div className="fd__grab" aria-hidden="true" />
        <div className="fd__sheethead">
          <h2>Feed settings</h2>
          <button onClick={onClose}>Done</button>
        </div>

        <button className="fd__row" onClick={toDirectory}>
          <i aria-hidden="true">&#8862;</i>
          <span>
            <strong>Switch to the directory</strong>
            <em>Grid, filters and full profiles</em>
          </span>
        </button>

        <h3>Distance</h3>
        <div className="fd__pills">
          {BANDS.map((b) => (
            <button
              key={b}
              className={'fd__pill' + (config.band === b ? ' is-on' : '')}
              aria-pressed={config.band === b}
              onClick={() => config.onBandChange?.(b)}
            >
              {b}
            </button>
          ))}
        </div>

        <button className="fd__row" onClick={onChangeLocation}>
          <i aria-hidden="true">&#9678;</i>
          <span>
            <strong>{origin.origin ? origin.origin.label : 'Set your location'}</strong>
            <em>
              {origin.origin
                ? 'Rounded before it leaves your phone. Change it any time.'
                : 'Needed for a distance. Never for “anywhere”.'}
            </em>
          </span>
        </button>

        <h3>Video</h3>
        <div className="fd__pills">
          <button
            className={'fd__pill' + (autoplay === 'wifi' ? ' is-on' : '')}
            aria-pressed={autoplay === 'wifi'}
            onClick={() => onAutoplay('wifi')}
          >
            Autoplay on Wi-Fi
          </button>
          <button
            className={'fd__pill' + (autoplay === 'never' ? ' is-on' : '')}
            aria-pressed={autoplay === 'never'}
            onClick={() => onAutoplay('never')}
          >
            Never autoplay
          </button>
        </div>
        <p className="fd__hint">
          Sound is always off when you open the feed, whatever you chose last
          time.
        </p>

        <h3>Your list</h3>
        <a className="fd__row" href={`${config.directoryUrl}#saved`}>
          <i aria-hidden="true">&#9825;</i>
          <span>
            <strong>Saved</strong>
            <em>
              {decisions.saves.length} on this device
              {decisions.ephemeral ? ' · not being kept' : ''}
            </em>
          </span>
        </a>

        {decisions.passCount > 0 ? (
          <button className="fd__row" onClick={() => { decisions.flush(); onClose(); }}>
            <i aria-hidden="true">&#8635;</i>
            <span>
              <strong>Bring back the ones you passed</strong>
              <em>{decisions.passCount} hidden. Keeps your saves.</em>
            </span>
          </button>
        ) : null}

        <p className="fd__hint fd__hint--last">
          Nobody is told when you save or pass them. Passes never leave this
          device.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export function useCoach(): [boolean, () => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* Read after mount, not during render — on a server render there is
       no storage and the flag would always look unset. */
    setShow(!readFlag(keys.coached));
  }, []);

  const done = () => {
    writeFlag(keys.coached);
    setShow(false);
  };

  return [show, done];
}

export function CoachOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div className="fd__coach" role="dialog" aria-modal="true" aria-label="How the feed works">
      <div className="fd__coachin">
        <Gesture glyph="⇕" title="Scroll for the next person">
          Up and down moves through everyone near you. Decides nothing.
        </Gesture>
        <Gesture glyph="→" title="Swipe right to save">
          Private. They are never told, and never see a pass.
        </Gesture>
        <Gesture glyph="←" title="Swipe left to pass">
          Hides them for now. You can bring everyone back any time.
        </Gesture>
        <Gesture glyph="⇱" title="Tap for the next photo">
          Tap the name to open the full profile.
        </Gesture>

        <button className="fd__coachgo" onClick={onDone} autoFocus>
          Start browsing
        </button>
      </div>
    </div>
  );
}

function Gesture({
  glyph,
  title,
  children,
}: {
  glyph: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fd__gesture">
      <b aria-hidden="true">{glyph}</b>
      <div>
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
    </div>
  );
}
