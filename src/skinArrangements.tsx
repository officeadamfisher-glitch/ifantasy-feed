/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — Arrangements skin

   Same unit as Escorts: a verified person, near you, save or pass. So
   there is almost nothing here, and that is the point — the shared layer
   carries it.

   What differs: the theme tokens (Claret, in theme.ts), the tag
   vocabulary (which arrives in the data, not the code), and one word on
   a button.
   ══════════════════════════════════════════════════════════════════════ */

import React from 'react';
import type { FeedSlots } from './FeedViewport';
import type { Category, FeedItem, FeedPage, DistanceBand } from './types';
import { PersonBody, BandChip } from './cardParts';

export function arrangementsSlots(opts: {
  onOpen: (item: FeedItem) => void;
  onSave?: (item: FeedItem) => void;
}): FeedSlots {
  return {
    renderHeader: (item) =>
      item.kind === 'person' ? <BandChip item={item} /> : null,
    renderBody: (item) =>
      item.kind === 'person' ? (
        /* "See more" rather than "View profile" — an arrangement is a
           conversation someone is opening, not a listing they are
           inspecting. One word, and it is the only copy difference. */
        <PersonBody item={item} openLabel="See more" />
      ) : null,
    onOpen: opts.onOpen,
    onSave: opts.onSave,
    /* No onPass, here or anywhere. The absence of the hook is the
       guarantee that nothing about a pass is reported. */
  };
}

/* The fetcher is identical in shape to Escorts; only the base differs,
   because Arrangements has its own backend. */
export function arrangementsFetchPage(base = '') {
  return async ({
    band,
    seeking,
    cursor,
    seed,
    origin,
  }: {
    band: DistanceBand;
    seeking: Category[];
    cursor: string | null;
    seed: number | null;
    origin: { lat: number; lng: number } | null;
  }): Promise<FeedPage> => {
    const q = new URLSearchParams({ band });

    /* Omitted when it is all three. Absent means everyone, so sending
       the full list is noise. */
    if (seeking.length && seeking.length < 3) q.set('seeking', seeking.join(','));
    if (band !== 'anywhere' && origin) {
      /* `where` is the current name. `near` still works. Addendum C4. */
      q.set('where', `${origin.lat},${origin.lng}`);
    }
    if (cursor) q.set('cursor', cursor);
    if (seed !== null) q.set('seed', String(seed));

    const res = await fetch(`${base}/api/feed?${q.toString()}`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    return (await res.json()) as FeedPage;
  };
}
