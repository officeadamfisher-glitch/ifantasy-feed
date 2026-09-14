/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — MediaFrame

   The profile presentation of the media stage. Same component, different
   box.

   Why a fixed frame rather than full bleed: the profile is a page you
   read, and the verification record is the reason the platform exists.
   On a full bleed gallery it sits below twelve hundred pixels of
   photograph. Here it is visible without scrolling on a 360px phone.

   Nothing about playback, segments, sound or the decoder budget is
   reimplemented. This is a wrapper.
   ══════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { MediaStage } from './MediaStage';
import type { MediaItem } from './types';
import type { AutoplayPref } from './VideoFrame';
import { themeVars, themes } from './theme';
import type { ProductId } from './types';

export interface MediaFrameProps {
  media: MediaItem[];
  /** Theme to apply. The profile can be rendered outside a FeedProvider. */
  product?: ProductId;
  /** Aspect ratio of the frame. 4/5 by default. */
  ratio?: string;
  /** Autoplay preference, if the product tracks one. */
  autoplayPref?: AutoplayPref;
  /** Rendered over the frame, top left. Usually the verified badge. */
  badge?: React.ReactNode;
  /** Pause everything. Set when the frame is not the visible surface. */
  suspended?: boolean;
}

export function MediaFrame({
  media,
  product = 'escorts',
  ratio = '4 / 5',
  autoplayPref = 'wifi',
  badge,
  suspended = false,
}: MediaFrameProps) {
  const style = {
    ...(themeVars(themes[product]) as React.CSSProperties),
    aspectRatio: ratio,
  };

  return (
    <div className="fd fd__frameBox" style={style}>
      <MediaStage
        media={media}
        /* A profile is always the thing being looked at, unless something
           has been opened over it. */
        active={!suspended}
        mounted
        eager
        autoplayPref={autoplayPref}
        /* One person, nothing to decide between, so horizontal moves
           through photographs rather than deciding anything. */
        swipeMode="segments"
        showCounter
        showArrows
      />
      {badge ? <div className="fd__framebadge">{badge}</div> : null}
    </div>
  );
}
