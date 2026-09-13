/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — Creator skin

   The one that genuinely differs. The unit is a post, not a person, so
   the card contents and the action layout change — but the gesture
   layer, the media stage, the decoder budget, the sound rule, the
   storage and the end card are all the same code.

   The standing ruling, enforced here:

     A PASS MEANS "NOT THIS POST". It must never suppress that creator's
     future posts.

   The component passes and saves by item id, and on Creator an item id
   is a post id, so this holds structurally. It is written down anyway,
   because the obvious "improvement" is to mute the creator and that
   would quietly strangle the people you need posting.
   ══════════════════════════════════════════════════════════════════════ */

import React from 'react';
import type { FeedSlots } from './FeedViewport';
import type { FeedItem, PostItem } from './types';
import { useCardActions } from './GestureLayer';
import { useFeed } from './FeedProvider';

/* ── header: who posted it ──────────────────────────────────────────── */

function PostHeader({
  item,
  onFollow,
}: {
  item: PostItem;
  onFollow?: (creatorId: string) => void;
}) {
  return (
    <div className="fd__posthead">
      <span className="fd__avatar" aria-hidden="true">
        {item.creator.avatarInitials}
      </span>
      <span className="fd__posthead-who">
        <strong>{item.creator.handle}</strong>
        <em>{ago(item.postedAt)}</em>
      </span>
      {onFollow ? (
        <button
          className="fd__chip"
          onClick={() => onFollow(item.creator.id)}
          data-no-drag
        >
          Follow
        </button>
      ) : null}
    </div>
  );
}

/* ── body: caption and tags, kept clear of the rail ─────────────────── */

function PostBody({ item }: { item: PostItem }) {
  return (
    <div className="fd__postbody">
      <p className="fd__caption">{item.caption}</p>
      <div className="fd__tags">
        {item.locked ? (
          <span className="fd__tag">Subscribers</span>
        ) : (
          <span className="fd__tag">Free</span>
        )}
        {item.tags.slice(0, 3).map((t) => (
          <span className="fd__tag" key={t}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── rail: what every content feed has taught people to expect ──────── */

function Rail({ item, onShare }: { item: PostItem; onShare?: (i: PostItem) => void }) {
  const { pass } = useCardActions();
  const { decisions } = useFeed();
  const saved = decisions.isSaved(item.id);

  return (
    <div className="fd__rail">
      <button
        className="fd__railbtn"
        onClick={() => decisions.toggleSave(item.id)}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved' : 'Save'}
        data-no-drag
      >
        <i aria-hidden="true">&#9829;</i>
        <small>Save</small>
      </button>

      {onShare ? (
        <button
          className="fd__railbtn"
          onClick={() => onShare(item)}
          aria-label="Share"
          data-no-drag
        >
          <i aria-hidden="true">&#8599;</i>
          <small>Share</small>
        </button>
      ) : null}

      {/* Pass, spelled out. On Creator this hides one post and nothing
          else — never the creator. */}
      <button className="fd__railbtn" onClick={pass} aria-label="Not this post" data-no-drag>
        <i aria-hidden="true">&#10005;</i>
        <small>Skip</small>
      </button>
    </div>
  );
}

/* ── locked ─────────────────────────────────────────────────────────────
   The blur is the product. A locked post inside the feed converts better
   than any subscribe page, which is the whole reason the format is worth
   copying.
   ──────────────────────────────────────────────────────────────────── */

function Locked({
  item,
  onSubscribe,
}: {
  item: PostItem;
  onSubscribe?: (creatorId: string) => void;
}) {
  return (
    <div className="fd__locked">
      <div className="fd__lockedin">
        <div className="fd__lockmark" aria-hidden="true">
          &#9678;
        </div>
        <strong>Subscribers only</strong>
        {item.price ? <span>{item.price}</span> : null}
        {onSubscribe ? (
          <button
            className="fd__lockbtn"
            onClick={() => onSubscribe(item.creator.id)}
            data-no-drag
          >
            Subscribe to see this
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ── slots ──────────────────────────────────────────────────────────── */

export function creatorSlots(opts: {
  onOpen: (item: FeedItem) => void;
  onSave?: (item: FeedItem) => void;
  onFollow?: (creatorId: string) => void;
  onSubscribe?: (creatorId: string) => void;
  onShare?: (item: PostItem) => void;
}): FeedSlots {
  return {
    /* A post is one piece of media, so the bar would otherwise vanish.
       Showing a single full segment keeps the chrome consistent with the
       multi-photo cards on the sibling products. */
    showSingleSegment: true,

    renderHeader: (item) =>
      item.kind === 'post' ? (
        <PostHeader item={item} onFollow={opts.onFollow} />
      ) : null,

    renderBody: (item) =>
      item.kind === 'post' ? (
        <>
          {item.locked ? (
            <Locked item={item} onSubscribe={opts.onSubscribe} />
          ) : null}
          <Rail item={item} onShare={opts.onShare} />
          <PostBody item={item} />
        </>
      ) : null,

    onOpen: opts.onOpen,
    onSave: opts.onSave,
  };
}

/* ── helpers ────────────────────────────────────────────────────────── */

function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
