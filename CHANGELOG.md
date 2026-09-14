# Changelog

## v0.2.0

Brings the component in line with Addendum C, and fixes the two things found
walking the live feed on a phone.

### Added

- **`swipeMode` on `MediaStage`**, `'none' | 'segments'`. The feed keeps
  `'none'` because `GestureLayer` owns horizontal there and horizontal means
  decide. The profile uses `'segments'`, where one person means nothing to
  decide between, so horizontal moves through photographs.
- **`MediaFrame`**, the framed presentation of the same media stage for the
  profile page. A wrapper, not a second gallery. Nothing about segments,
  playback, sound or the decoder budget is reimplemented.
- **`showCounter` and `showArrows` on `MediaStage`.** Arrows render on pointer
  devices only, by CSS.
- **`suspended` on the feed context**, with `setSuspended`. Set it when a
  profile sheet opens over the feed. Without it, two video elements end up
  alive at once and audio carries on from a card nobody can see.
- **`seeking` on `FeedConfig`**, with `onSeekingChange`. Multiple on the client
  side. Absent or all three means everyone, and it is never narrowed on
  somebody's behalf.
- **`Category` type**, `'women' | 'men' | 'trans'`. Self declared by the
  provider, never assigned, never derived from Identity.
- **`bands.ts`**: band identifiers, canonical radii, local labels and unit
  resolution.
- **Looking for** group in the settings sheet, above Distance.

### Changed

- **The cog is deleted.** It was a second door to a room that already had one,
  because the chips beside it opened the same sheet. It is replaced by a single
  state pill showing both feed controls with a caret. The pill never hides, even
  when both values are at their widest, because a person who cannot see what is
  filtering their results assumes nothing is.
- **`DistanceBand` is now `'near' | 'city' | 'wider' | 'anywhere'`.** A band is
  an identifier, not a measurement. The server owns the radius in metres and the
  component owns the words, because "under 5 miles" reads as nonsense in Berlin.
  Legacy spellings are mapped by `normaliseBand` rather than rejected.
- **Fetchers send `where` rather than `near`.** Both work on the backend.
- **Fetchers send `seeking`**, omitted when it is all three.
- Card meta lines and band chips are labelled in the reader's own units.

### Removed

- `nextBand` is no longer exported from `EndCard`. It comes from `bands` now.

### Migration for the product repos

**Breaking, and it is one line in most places.** `band` values change:

```
'under 1 mile'   →  'near'
'under 5 miles'  →  'city'
'under 10 miles' →  'wider'
'anywhere'       →  'anywhere'
```

Anything that stored a band on a device or in a URL should be run through
`normaliseBand` on read. The backend already accepts both.

Add `seeking` and `onSeekingChange` to the config if the product tracks them,
which Escorts now does. Everything else is additive and needs no change.

## v0.1.0

First release. Nine steps: shell and scroll snap, media stage, gesture layer,
saves and passes, end card, video, settings and routing, the Escorts skin, and
the Arrangements and Creator skins.
