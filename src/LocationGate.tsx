/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — LocationGate

   Shown when someone asks for a distance and we have nothing to measure
   from. Never on load.

   The sequence matters more than the design. Ask for permission only
   after an explicit tap on a distance, with the reason visible on the
   same screen. A prompt that arrives unexplained gets denied, and a
   denial is sticky — so a badly-timed ask costs the fallback too.
   ══════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import type { City, OriginState } from './useOrigin';

export interface LocationGateProps {
  state: OriginState;
  cities: City[];
  /** Carry on without a distance filter. */
  onAnywhere: () => void;
  onClose?: () => void;
}

export function LocationGate({
  state,
  cities,
  onAnywhere,
  onClose,
}: LocationGateProps) {
  const [query, setQuery] = useState('');
  const [showCities, setShowCities] = useState(state.needsCity);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? cities.filter((c) => c.name.toLowerCase().includes(q))
      : cities;
    return list.slice(0, 40);
  }, [cities, query]);

  const asking = state.status === 'asking';

  return (
    <div className="fd__gate" role="dialog" aria-modal="true" aria-label="Set your location">
      <div className="fd__gatebox">
        {onClose ? (
          <button className="fd__gateclose" onClick={onClose} aria-label="Close">
            &#10005;
          </button>
        ) : null}

        {!showCities ? (
          <>
            <h2>Where are you looking?</h2>
            <p>
              Distance is shown in bands rather than exact figures. We
              never show an exact distance, and we round your position before
              it leaves your phone.
            </p>

            <button
              className="fd__gateprimary"
              onClick={state.requestDevice}
              disabled={asking}
            >
              {asking ? 'Waiting for your phone…' : 'Use my location'}
            </button>

            <button className="fd__gatealt" onClick={() => setShowCities(true)}>
              Choose a city instead
            </button>

            {state.status === 'denied' ? (
              <p className="fd__gateerr">
                Your browser is blocking location for this site. Choosing a
                city works just as well.
              </p>
            ) : null}
            {state.status === 'timeout' ? (
              <p className="fd__gateerr">
                That took too long. Try again, or choose a city.
              </p>
            ) : null}
            {state.status === 'unavailable' ? (
              <p className="fd__gateerr">
                Your device could not give us a position. Choose a city
                instead.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h2>Choose a city</h2>
            <p>
              {/* Only cities with verified listings are offered — the same
                  rule as city pages. Nowhere is listed with nothing behind
                  it. */}
              These are the cities where people have verified.
            </p>

            <label className="fd__sr" htmlFor="fd-city">
              Search cities
            </label>
            <input
              id="fd-city"
              className="fd__gatesearch"
              type="search"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <ul className="fd__citylist">
              {matches.map((c) => (
                <li key={c.id}>
                  <button onClick={() => state.setCity(c)}>
                    <span>{c.name}</span>
                    {typeof c.total === 'number' ? <em>{c.total}</em> : null}
                  </button>
                </li>
              ))}
              {!matches.length ? (
                <li className="fd__citynone">
                  Nobody has verified in a city matching that yet.
                </li>
              ) : null}
            </ul>

            {!state.needsCity ? (
              <button className="fd__gatealt" onClick={() => setShowCities(false)}>
                Use my location instead
              </button>
            ) : null}
          </>
        )}

        <button className="fd__gateskip" onClick={onAnywhere}>
          Show me everyone, anywhere
        </button>
      </div>
    </div>
  );
}
