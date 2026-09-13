/* ══════════════════════════════════════════════════════════════════════
   Local development without a backend.

   Useful while the photo pipeline is still being proved: the real
   endpoint correctly returns nothing until a listing has an approved
   photo, which makes the feed impossible to look at.

   Never ship this. It is here so a build session can see the component
   working, not so anyone can seed the product with invented people.
   ══════════════════════════════════════════════════════════════════════ */

import type { FeedPage, DistanceBand } from '@ifantasy/feed';

const BANDS: DistanceBand[] = ['under 1 mile', 'under 5 miles', 'under 10 miles'];

export function mockFetchPage(count = 9) {
  const all = Array.from({ length: count }, (_, i) => ({
    kind: 'person' as const,
    id: `mock-${i}`,
    name: `Provider ${String.fromCharCode(65 + i)}`,
    area: ['Shoreditch', 'Camden', 'Soho', 'Islington', 'Hackney'][i % 5]!,
    band: BANDS[i % BANDS.length]!,
    verified: true,
    verifiedAt: '2026-03-14',
    activeToday: i % 3 === 0,
    bio: 'Placeholder description. Nothing here is a real person.',
    tags: ['Incall', 'Outcall'],
    url: `/p/mock-${i}`,
    media: [{ type: 'photo' as const, url: '/demo/media/poster.jpg' }],
  }));

  return async ({ cursor }: { cursor: string | null }): Promise<FeedPage> => {
    const page = cursor ? Number(cursor) : 0;
    const size = 12;
    const slice = all.slice(page * size, page * size + size);
    return {
      total: all.length,
      seed: 20260925,
      items: slice,
      nextCursor: (page + 1) * size < all.length ? String(page + 1) : null,
    };
  };
}
