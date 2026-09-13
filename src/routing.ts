/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — routing

   Phone gets the feed. Desktop gets the site. Either can switch, and the
   switch sticks.

   Call `installFeedRouting` from the landing page, after render. It does
   nothing on desktop, nothing on a deep link, and nothing to a crawler.
   ══════════════════════════════════════════════════════════════════════ */

import type { ProductId } from './types';
import { keys } from './storage';

export type Surface = 'feed' | 'directory';

export function getSurface(product: ProductId): Surface | null {
  try {
    const v = window.localStorage.getItem(keys.surface(product));
    return v === 'feed' || v === 'directory' ? v : null;
  } catch {
    return null;
  }
}

export function setSurface(product: ProductId, s: Surface): void {
  try {
    window.localStorage.setItem(keys.surface(product), s);
  } catch {
    /* Private browsing. The choice holds for this session only. */
  }
}

/* ── bots ──────────────────────────────────────────────────────────────
   The one place a user-agent string is the right tool.

   Capability detection must never use the UA — it describes what a
   browser claims to be. But identifying a crawler is exactly what the UA
   is for, and there is no other signal: Googlebot executes JavaScript and
   emulates a touch device, so `pointer: coarse` is true for it. Without
   this check the crawler follows the redirect, indexes the feed instead
   of the landing page, and the city pages lose the internal link they
   depend on.
   ──────────────────────────────────────────────────────────────────── */
const BOTS =
  /bot|crawl|spider|slurp|bingpreview|duckduckbot|baiduspider|yandex|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|discordbot|preview|lighthouse|headlesschrome/i;

export function isCrawler(ua = navigator.userAgent): boolean {
  return BOTS.test(ua);
}

export interface RoutingOptions {
  product: ProductId;
  /** Where the feed lives. Default '/nearby'. */
  feedPath?: string;
  /** Only redirect from these paths. Default ['/'] — the root, and nothing else. */
  rootPaths?: string[];
  /** Below this width a device is treated as a phone. Default 820. */
  maxWidth?: number;
}

export function shouldRouteToFeed({
  product,
  rootPaths = ['/'],
  maxWidth = 820,
}: RoutingOptions): boolean {
  if (typeof window === 'undefined') return false;

  /* Only the root. Someone arriving from a search result on /manchester,
     /safety or a profile asked for that page and gets it. Bouncing a
     search visitor into the feed throws away the only free acquisition
     channel the product has. */
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!rootPaths.map((p) => p.replace(/\/+$/, '') || '/').includes(path)) {
    return false;
  }

  /* Escape hatch, for anyone debugging the landing page on a phone. */
  if (new URLSearchParams(window.location.search).has('nofeed')) return false;

  if (isCrawler()) return false;

  /* Device capability, never the user agent. Pointer type and viewport
     describe what someone is actually holding. */
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (!coarse || window.innerWidth >= maxWidth) return false;

  /* A person who chose the directory is not bounced again until they
     switch back. Default by device, override by person. */
  return getSurface(product) !== 'directory';
}

export function installFeedRouting(opts: RoutingOptions): void {
  if (!shouldRouteToFeed(opts)) return;
  const to = opts.feedPath ?? '/nearby';

  /* replace, never assign — otherwise the back button ping-pongs between
     the site and the feed forever. */
  window.location.replace(to + window.location.search + window.location.hash);
}
