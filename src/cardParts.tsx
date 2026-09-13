/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — shared card pieces

   The parts of a card body that are the same on every product. A skin
   composes these; it does not reimplement them.

   If a piece here needs to differ per product, it takes a prop. It does
   not get copied into a skin — that is how three products end up with
   three verified badges that drift apart.
   ══════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { useCardActions } from './GestureLayer';
import { useFeed } from './FeedProvider';
import type { PersonItem } from './types';

/* ── verified badge ─────────────────────────────────────────────────── */

export function VerifiedBadge({ date }: { date?: string }) {
  return (
    <span className="fd__vb">
      <span aria-hidden="true">&#10003;</span> Verified
      {date ? ` ${date}` : ''}
    </span>
  );
}

/* ── meta line ──────────────────────────────────────────────────────── */

export function MetaLine({ parts }: { parts: (string | false | undefined)[] }) {
  const shown = parts.filter(Boolean) as string[];
  return <p className="fd__meta">{shown.join(' · ')}</p>;
}

/* ── tags ───────────────────────────────────────────────────────────── */

export function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="fd__tags">
      {tags.slice(0, 4).map((t) => (
        <span className="fd__tag" key={t}>
          {t}
        </span>
      ))}
    </div>
  );
}

/* ── action row ─────────────────────────────────────────────────────────
   Buttons and gestures run through the same functions, so they can never
   drift. A meaningful share of people never learn a gesture, and the ones
   who cannot use one are exactly the ones who most need the button.
   ──────────────────────────────────────────────────────────────────── */

export function ActionRow({
  id,
  openLabel = 'View profile',
}: {
  id: string;
  openLabel?: string;
}) {
  const { pass, open } = useCardActions();
  const { decisions } = useFeed();
  const saved = decisions.isSaved(id);

  return (
    <div className="fd__acts">
      <button
        className="fd__circ"
        onClick={pass}
        aria-label="Pass"
        data-no-drag
      >
        &#10005;
      </button>

      <button className="fd__open" onClick={open} data-no-drag>
        {openLabel}
      </button>

      {/* The button manages; the gesture decides and moves on. Swiping
          right twice leaves a card saved — the heart is where you take it
          back. A gesture that toggles means a double-swipe silently
          undoes what someone just did. */}
      <button
        className="fd__circ fd__circ--save"
        onClick={() => decisions.toggleSave(id)}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved' : 'Save'}
        data-no-drag
      >
        &#9829;
      </button>
    </div>
  );
}

/* ── bio ────────────────────────────────────────────────────────────── */

export function Bio({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="fd__bio">{text}</p>;
}

/* ── person card ────────────────────────────────────────────────────────
   Escorts and Arrangements are the same unit: a verified person, near
   you, save or pass. They share this body entirely. The only things a
   product supplies are the open label and its own tag vocabulary, which
   arrives in the data rather than the code.

   If a product ever needs a different shape here, it takes a prop. It
   does not get a copy — a copy is how three products end up with three
   verified badges that drift apart.
   ──────────────────────────────────────────────────────────────────── */

export function PersonBody({
  item,
  openLabel = 'View profile',
}: {
  item: PersonItem;
  openLabel?: string;
}) {
  return (
    <>
      {item.verified ? <VerifiedBadge date={shortDate(item.verifiedAt)} /> : null}
      <h2 className="fd__name">{item.name}</h2>
      <MetaLine
        parts={[
          item.area,
          /* Always the band string. A number must never reach this line,
             or any other. */
          item.band,
          item.activeToday && 'active today',
        ]}
      />
      <Bio text={item.bio} />
      <Tags tags={item.tags} />
      <ActionRow id={item.id} openLabel={openLabel} />
    </>
  );
}

export function BandChip({ item }: { item: PersonItem }) {
  return <span className="fd__chip">{item.band}</span>;
}

/** "14 Mar" — short enough for a badge, specific enough to be a claim. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
