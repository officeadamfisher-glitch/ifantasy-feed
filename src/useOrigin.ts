/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — useOrigin

   Where the viewer is measuring from.

   Three rules shape this file:

   1. Client-sent, never IP-derived. IP lookup is frequently wrong by tens
      of miles and being wrong about distance here is worse than asking.

   2. Rounded to two decimal places — about 1.1km — before it leaves the
      device. Bands are 1, 5 and 10 miles, so a kilometre of slop changes
      nothing except at an edge where the answer was arbitrary anyway. A
      precise log of where people were while browsing this site has no
      operational purpose, and the cheapest way not to leak it is not to
      hold it.

   3. Never asked for on load. A permission prompt the instant someone
      opens an escort directory is alarming, it gets denied, and a denial
      is permanent for that origin — so the prompt costs the fallback as
      well. It fires only when someone chooses a distance.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from 'react';
import type { ProductId } from './types';

/** ~1.1km. Enough for a 1-mile band, coarse enough to be worth nothing. */
const PRECISION = 2;

export function coarse(n: number): number {
  return Math.round(n * 10 ** PRECISION) / 10 ** PRECISION;
}

export interface Origin {
  lat: number;
  lng: number;
  /** What to show the person: "Your location" or a city name. */
  label: string;
  source: 'device' | 'city';
}

export interface City {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lng: number;
  total?: number;
}

export type OriginStatus =
  | 'none'        // nothing chosen yet
  | 'asking'      // permission prompt is open
  | 'ready'
  | 'denied'      // they said no, or the browser remembered a no
  | 'unavailable' // no fix, or no geolocation at all
  | 'timeout';

const key = (p: ProductId) => `ifantasy.feed.origin.${p}`;

function read(product: ProductId): Origin | null {
  try {
    const raw = window.localStorage.getItem(key(product));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return typeof o?.lat === 'number' && typeof o?.lng === 'number' ? o : null;
  } catch {
    return null;
  }
}

function write(product: ProductId, o: Origin | null): void {
  try {
    if (o) window.localStorage.setItem(key(product), JSON.stringify(o));
    else window.localStorage.removeItem(key(product));
  } catch {
    /* Private browsing. The origin lives for this session only. */
  }
}

export interface OriginState {
  origin: Origin | null;
  status: OriginStatus;
  /** Fires the permission prompt. Only ever from an explicit tap. */
  requestDevice: () => void;
  setCity: (c: City) => void;
  clear: () => void;
  /** True once we know the browser will not ask again. */
  needsCity: boolean;
}

export function useOrigin(product: ProductId): OriginState {
  const [origin, setOrigin] = useState<Origin | null>(() => read(product));
  const [status, setStatus] = useState<OriginStatus>(() =>
    read(product) ? 'ready' : 'none'
  );

  useEffect(() => {
    const stored = read(product);
    setOrigin(stored);
    setStatus(stored ? 'ready' : 'none');
  }, [product]);

  const requestDevice = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const o: Origin = {
          /* Rounded here, before it is stored and before it is sent. */
          lat: coarse(pos.coords.latitude),
          lng: coarse(pos.coords.longitude),
          label: 'Your location',
          source: 'device',
        };
        setOrigin(o);
        write(product, o);
        setStatus('ready');
      },
      (err) => {
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err.code === err.TIMEOUT
              ? 'timeout'
              : 'unavailable'
        );
      },
      {
        /* We round to 1.1km regardless, so GPS-grade precision costs
           battery and a slower fix for nothing. */
        enableHighAccuracy: false,
        timeout: 8000,
        /* A half-hour-old fix is fine for a distance band. */
        maximumAge: 1_800_000,
      }
    );
  }, [product]);

  const setCity = useCallback(
    (c: City) => {
      const o: Origin = {
        lat: coarse(c.lat),
        lng: coarse(c.lng),
        label: c.name,
        source: 'city',
      };
      setOrigin(o);
      write(product, o);
      setStatus('ready');
    },
    [product]
  );

  const clear = useCallback(() => {
    setOrigin(null);
    write(product, null);
    setStatus('none');
  }, [product]);

  return {
    origin,
    status,
    requestDevice,
    setCity,
    clear,
    /* Denied is permanent for this origin until the person changes it in
       browser settings, so there is no point offering the button again. */
    needsCity:
      status === 'denied' || status === 'unavailable' || status === 'timeout',
  };
}
