/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — types
   Shared across Escorts, Arrangements and Creator.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Distance is ALWAYS a band identifier. A number must never reach the
 * client.
 *
 * These are identifiers, not measurements. The server owns the radius in
 * metres; the component owns the words, because "under 5 miles" reads as
 * nonsense in Berlin. See bands.ts and Addendum C5.
 */
export type DistanceBand = 'near' | 'city' | 'wider' | 'anywhere';

/**
 * How a provider chooses to be found. Self declared at listing creation,
 * never assigned, never derived from Identity. Addendum C1.
 */
export type Category = 'women' | 'men' | 'trans';

export interface MediaItem {
  type: 'photo' | 'video';
  url: string;
  /** Required when type === 'video'. Generated server-side at upload. */
  poster?: string;
  /**
   * Intrinsic dimensions. Optional, because the provider tile does not
   * send them yet.
   *
   * When present they go on the <img> so the browser reserves the box
   * before the bytes arrive and the card does not reflow. When absent the
   * card's own 9:16 box holds the space instead — so a missing dimension
   * costs a little layout precision, never a broken render. Send them
   * when the tile can.
   */
  width?: number;
  height?: number;
  /** Required when type === 'video'. Capped at 30_000 on upload. */
  durationMs?: number;
}

interface BaseItem {
  id: string;
  /** 1–10 items. media[0] MUST be a photo — enforced by the API. */
  media: MediaItem[];
  /** Canonical profile or post URL. */
  url: string;
}

export interface PersonItem extends BaseItem {
  kind: 'person';
  name: string;
  /** Self declared by the provider. Exactly one. */
  category?: Category;
  /** Broad area only — "Camden", never a street. */
  area: string;
  band: DistanceBand;
  verified: boolean;
  verifiedAt: string;
  activeToday: boolean;
  bio: string;
  tags: string[];
}

export interface PostItem extends BaseItem {
  kind: 'post';
  creator: { id: string; handle: string; avatarInitials: string };
  postedAt: string;
  caption: string;
  locked: boolean;
  price?: string;
  tags: string[];
}

export type FeedItem = PersonItem | PostItem;

export interface FeedPage {
  /** True count for the current band. The end card says this out loud. */
  total: number;
  /**
   * Optional. How many are verified at the next band out. Lets the end card
   * say "another 14 verified" instead of an unqualified "widen".
   * If absent the card offers to widen without claiming a number — it must
   * never invent one.
   */
  widerTotal?: number;
  /** Daily rotation seed. Echo it back on every subsequent page. */
  seed: number;
  items: FeedItem[];
  nextCursor: string | null;
}

/** Which product is mounting the feed. Selects the theme and the slots. */
export type ProductId = 'escorts' | 'arrangements' | 'creator';

export interface FeedTheme {
  ground: string;
  surface: string;
  accent: string;
  accentText: string;
  tint: string;
  saveColor: string;
  scrim: string;
  verifiedText: string;
  fontDisplay: string;
  fontBody: string;
}

export interface FeedConfig {
  product: ProductId;
  band: DistanceBand;
  /**
   * Which categories to show. Answered once at the door and remembered.
   * This is not a filter on the feed, it is which feed is being opened.
   * Absent or all three means everyone.
   */
  seeking?: Category[];
  /**
   * Fetches one page. Must echo `seed` back after the first call.
   *
   * `origin` is present only when `band !== 'anywhere'`, and its
   * coordinates are already rounded to two decimal places. Do not send a
   * precise position, and do not ask the server to widen the band when
   * the origin is missing — it returns nothing, on purpose.
   */
  fetchPage: (args: {
    band: DistanceBand;
    /** Empty or all three means no narrowing. Never guess on someone's behalf. */
    seeking: Category[];
    cursor: string | null;
    seed: number | null;
    origin: { lat: number; lng: number } | null;
  }) => Promise<FeedPage>;
  /** Where "switch to the directory" goes. */
  directoryUrl: string;
  /** Where quick exit goes. */
  exitUrl?: string;
  /** Widening the band. The product owns `band`, so it performs the change. */
  onBandChange?: (band: DistanceBand) => void;
  /** Changing who the feed is showing. The product owns `seeking`. */
  onSeekingChange?: (seeking: Category[]) => void;
  /**
   * Capturing an email for "tell me when someone new verifies".
   * Omit it and the option is not shown — a dead field that swallows an
   * address is worse than not asking.
   */
  onNotify?: (email: string) => Promise<void>;
  /**
   * Cities offered as the location fallback. Only ones with verified
   * listings — never offer somewhere with nothing behind it.
   */
  cities?: { id: string; name: string; country?: string; lat: number; lng: number; total?: number }[];
}
