/* ══════════════════════════════════════════════════════════════════════
   Escorts — landing page routing

   Call this once, after the landing page has rendered. It is the only
   routing code the product needs.

   What it does NOT do, on purpose:
   - It does not run on the server, so `/` always serves indexable HTML
   - It does not run for a crawler
   - It does not run on any path but the root
   - It does not run for someone who chose the directory
   ══════════════════════════════════════════════════════════════════════ */

import { installFeedRouting } from '@ifantasy/feed';

installFeedRouting({
  product: 'escorts',
  feedPath: '/nearby',
});
