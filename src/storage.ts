/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — storage

   A deliberately small wrapper around localStorage.

   Two reasons it exists rather than calling localStorage directly:

   1. It throws. In Safari private browsing, with cookies blocked, inside
      some in-app browsers, and when a quota is full, both read and write
      raise. An uncaught throw here takes the whole feed down at the
      moment someone taps save — the single worst place to fail.

   2. It keeps every storage key in one file, so "what does this product
      keep on a device" has one honest answer.

   There is no network code in this module and there must never be any.
   Passes never leave the device, and the cheapest way to guarantee that
   is for the code that holds them to have no way to send them.
   ══════════════════════════════════════════════════════════════════════ */

import type { ProductId } from './types';

const memory = new Map<string, string>();
let usable: boolean | null = null;

function available(): boolean {
  if (usable !== null) return usable;
  try {
    const probe = '__fd__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    usable = true;
  } catch {
    usable = false;
  }
  return usable;
}

function readRaw(key: string): string | null {
  if (!available()) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  if (!available()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Quota or a blocked store. The in-memory copy keeps the session
       working; it simply will not survive a reload. That is a far better
       outcome than an exception mid-gesture. */
  }
}

export function readList(key: string): string[] {
  const raw = readRaw(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function writeList(key: string, list: string[]): void {
  writeRaw(key, JSON.stringify(list));
}

export function readValue(key: string): string | null {
  return readRaw(key);
}

export function writeValue(key: string, value: string): void {
  writeRaw(key, value);
}

export function readFlag(key: string): boolean {
  return readRaw(key) === '1';
}

export function writeFlag(key: string): void {
  writeRaw(key, '1');
}

/** Every key this package writes. Nothing else touches the device. */
export const keys = {
  saves: (p: ProductId) => `ifantasy.feed.saves.${p}`,
  passes: (p: ProductId) => `ifantasy.feed.passes.${p}`,
  /** First-run gesture coaching, shown once ever. */
  coached: 'ifantasy.feed.coached',
  /** "Saved to this device" notice, shown once per product. */
  savedNotice: (p: ProductId) => `ifantasy.feed.savednotice.${p}`,
  /** feed | directory — which surface this device prefers. */
  surface: (p: ProductId) => `ifantasy.feed.surface.${p}`,
  /** wifi | never — video autoplay preference. */
  autoplay: (p: ProductId) => `ifantasy.feed.autoplay.${p}`,
};

/** Storage is not working — private browsing, blocked cookies, in-app browser. */
export function isEphemeral(): boolean {
  return !available();
}
