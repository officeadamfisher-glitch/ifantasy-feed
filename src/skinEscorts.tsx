/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — Escorts skin

   The whole product-specific surface of the feed, in one file.

   Arrangements is this file with different tags and a different theme
   token set. Creator is this file with a post instead of a person and a
   rail instead of a row. If either takes longer than a day, the shared
   layer was not shared and the work needs redoing before a third product
   compounds it.
   ══════════════════════════════════════════════════════════════════════ */

import React from 'react';
import type { FeedSlots } from './FeedViewport';
import type { FeedItem, FeedPage, DistanceBand } from './types';
import { PersonBody, BandChip } from './cardParts';

/* ── slots ──────────────────────────────────────────────────────────── */

export function escortsSlots(opts: {
  onOpen: (item: FeedItem) => void;
  onSave?: (item: FeedItem) => void;
}): FeedSlots {
  return {
    renderHeader: (item) =>
      item.kind === 'person' ? <BandChip item={item} /> : null,
    renderBody: (item) =>
      item.kind === 'person' ? (
        <PersonBody item={item} openLabel="View profile" />
      ) : null,
    onOpen: opts.onOpen,
    onSave: opts.onSave,
    /* Deliberately no onPass. Nothing about a pass is reported anywhere,
       and the absence of the hook is the guarantee. */
  };
}

/* ── fetcher ────────────────────────────────────────────────────────────
   Matches the live endpoint. The component never builds this URL — it
   hands over an already-rounded origin and the product assembles the
   query, so the parameter names belong to the backend.
   ──────────────────────────────────────────────────────────────────── */

export function escortsFetchPage(base = '') {
  return async ({
    band,
    cursor,
    seed,
    origin,
  }: {
    band: DistanceBand;
    cursor: string | null;
    seed: number | null;
    origin: { lat: number; lng: number } | null;
  }): Promise<FeedPage> => {
    const q = new URLSearchParams({ band });

    /* Never sent for `anywhere` — there is nothing to measure. And a
       specific band with no origin deliberately returns nothing rather
       than widening: silently showing people 40 miles away when someone
       asked for 1 destroys trust in the number on the end card. */
    if (band !== 'anywhere' && origin) {
      q.set('near', `${origin.lat},${origin.lng}`);
    }
    if (cursor) q.set('cursor', cursor);
    /* Echoed back on every page after the first, or the server reshuffles
       and the same person appears twice. */
    if (seed !== null) q.set('seed', String(seed));

    const res = await fetch(`${base}/api/feed?${q.toString()}`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    return (await res.json()) as FeedPage;
  };
}

export async function fetchCities(base = '') {
  const res = await fetch(`${base}/api/feed/cities`, { credentials: 'omit' });
  if (!res.ok) throw new Error(`cities ${res.status}`);
  const data = (await res.json()) as {
    cities: { id: string; name: string; country?: string; lat: number; lng: number; total?: number }[];
  };
  return data.cities ?? [];
}
