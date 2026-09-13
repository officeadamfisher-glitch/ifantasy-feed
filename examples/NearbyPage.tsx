/* ══════════════════════════════════════════════════════════════════════
   Escorts — /nearby

   The whole page. Drop it in, point it at the live API, done.

   Everything product-specific is in this file and in skinEscorts.tsx.
   Nothing else in the package knows what Escorts is.
   ══════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import {
  FeedProvider,
  FeedViewport,
  escortsSlots,
  escortsFetchPage,
  fetchCities,
  type DistanceBand,
  type City,
  type FeedItem,
} from '@ifantasy/feed';
import '@ifantasy/feed/src/feed.css';

/* Same origin in production. Set a base only if the API moves. */
const API_BASE = '';

export default function NearbyPage() {
  /* `anywhere` is the right first band: it needs no location, so nobody
     is asked for permission before they have any reason to say yes. */
  const [band, setBand] = useState<DistanceBand>('anywhere');
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    /* Only cities with verified listings come back — never offer
       somewhere with nothing behind it. A failure here is not fatal: the
       gate still offers device location and "anywhere". */
    fetchCities(API_BASE).then(setCities).catch(() => setCities([]));
  }, []);

  const open = (item: FeedItem) => {
    /* Real navigation, not a modal route, so the back button works and
       the URL is shareable. */
    window.location.assign(item.url);
  };

  return (
    <FeedProvider
      config={{
        product: 'escorts',
        band,
        onBandChange: setBand,
        fetchPage: escortsFetchPage(API_BASE),
        directoryUrl: '/browse',
        cities,
        onNotify: async (email) => {
          const res = await fetch(`${API_BASE}/api/feed/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, band }),
          });
          if (!res.ok) throw new Error('notify failed');
        },
      }}
    >
      <FeedViewport slots={escortsSlots({ onOpen: open })} />
    </FeedProvider>
  );
}
