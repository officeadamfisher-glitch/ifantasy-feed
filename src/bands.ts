/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — bands

   Addendum C5. A band is an identifier, not a measurement.

   "Under 5 miles" reads as nonsense in Berlin. So the API takes and
   returns four identifiers, the server owns the radius in metres, and
   the component owns the words. A client in Germany and a client in
   Manchester send the same request and see different labels.
   ══════════════════════════════════════════════════════════════════════ */

import type { DistanceBand } from './types';

export const BANDS: DistanceBand[] = ['near', 'city', 'wider', 'anywhere'];

/** Canonical radii, for reference only. The server is authoritative. */
export const BAND_METRES: Record<DistanceBand, number | null> = {
  near: 1600,
  city: 8000,
  wider: 16000,
  anywhere: null,
};

export type Units = 'mi' | 'km';

const LABELS: Record<DistanceBand, Record<Units, string>> = {
  near: { mi: 'Under 1 mile', km: 'Under 2 km' },
  city: { mi: 'Under 5 miles', km: 'Under 8 km' },
  wider: { mi: 'Under 10 miles', km: 'Under 15 km' },
  anywhere: { mi: 'Anywhere', km: 'Anywhere' },
};

export function bandLabel(band: DistanceBand, units: Units): string {
  return LABELS[band][units];
}

export function nextBand(band: DistanceBand): DistanceBand | null {
  const i = BANDS.indexOf(band);
  return i >= 0 && i < BANDS.length - 1 ? BANDS[i + 1]! : null;
}

/* ── legacy spellings ──────────────────────────────────────────────────
   The first version of the API took these strings. Addendum C says both
   are accepted during the transition, so anything arriving in the old
   form is mapped rather than rejected. Remove this once no caller sends
   them.
   ──────────────────────────────────────────────────────────────────── */
const LEGACY: Record<string, DistanceBand> = {
  'under 1 mile': 'near',
  'under 5 miles': 'city',
  'under 10 miles': 'wider',
  anywhere: 'anywhere',
};

export function normaliseBand(value: string): DistanceBand {
  if ((BANDS as string[]).includes(value)) return value as DistanceBand;
  return LEGACY[value.toLowerCase()] ?? 'anywhere';
}

/* ── units ─────────────────────────────────────────────────────────────
   Three countries still use miles in everyday speech. Everywhere else
   gets kilometres, and the country of the place someone actually chose
   beats their browser language, because a phone set to English in Berlin
   is common and language is not location.
   ──────────────────────────────────────────────────────────────────── */
const MILE_COUNTRIES = new Set(['GB', 'US', 'LR', 'MM']);

export function unitsFor(countryCode?: string | null): Units {
  if (countryCode) return MILE_COUNTRIES.has(countryCode.toUpperCase()) ? 'mi' : 'km';

  if (typeof navigator !== 'undefined' && navigator.language) {
    const region = navigator.language.split('-')[1];
    if (region) return MILE_COUNTRIES.has(region.toUpperCase()) ? 'mi' : 'km';
    if (navigator.language.toLowerCase().startsWith('en')) return 'mi';
  }
  return 'km';
}
