/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — themes

   The ONLY place a colour appears in this package. No component file may
   contain a hex value. If you need a new colour, add a token here.
   ══════════════════════════════════════════════════════════════════════ */

import type { FeedTheme, ProductId } from './types';

const DISPLAY = "'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

export const escorts: FeedTheme = {
  ground: '#14291f',
  surface: '#f4f4f0',
  accent: '#1d3b2f',
  accentText: '#ffffff',
  tint: '#e3e8e2',
  saveColor: '#e4566e',
  scrim: 'rgba(10,16,13,.88)',
  verifiedText: '#1d3b2f',
  fontDisplay: DISPLAY,
  fontBody: BODY,
};

export const arrangements: FeedTheme = {
  ground: '#221a1e',
  surface: '#f7f4ef',
  accent: '#a3213f',
  accentText: '#ffffff',
  tint: '#f3e3e6',
  saveColor: '#bd3450',
  scrim: 'rgba(20,12,14,.88)',
  verifiedText: '#8a2f52',
  fontDisplay: DISPLAY,
  fontBody: BODY,
};

export const creator: FeedTheme = {
  ground: '#130f1d',
  surface: '#f5f3f8',
  accent: '#a78bfa',
  accentText: '#1a1430',
  tint: '#251d3a',
  saveColor: '#a78bfa',
  scrim: 'rgba(12,9,20,.88)',
  verifiedText: '#6d55c7',
  fontDisplay: DISPLAY,
  fontBody: BODY,
};

export const themes: Record<ProductId, FeedTheme> = {
  escorts,
  arrangements,
  creator,
};

/** Flattens a theme onto a DOM node as CSS custom properties. */
export function themeVars(t: FeedTheme): Record<string, string> {
  return {
    '--fd-ground': t.ground,
    '--fd-surface': t.surface,
    '--fd-accent': t.accent,
    '--fd-accent-text': t.accentText,
    '--fd-tint': t.tint,
    '--fd-save': t.saveColor,
    '--fd-scrim': t.scrim,
    '--fd-verified': t.verifiedText,
    '--fd-display': t.fontDisplay,
    '--fd-body': t.fontBody,
  };
}
