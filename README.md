# @ifantasy/feed

Shared feed component for Escorts, Arrangements and Creator. One gesture layer,
one media player, three skins.

Spec: `ifantasy-feed-component-spec.md`.

## Status — complete. 9 of 9.

| Step | What | State |
|---|---|---|
| 1 | Shell, viewport, scroll-snap, card mounting | **done** |
| 2 | MediaStage — photos, segments, tap | **done** |
| 3 | GestureLayer — horizontal, thresholds, stamps | **done** |
| 4 | Save and pass state, local storage, flush | **done** |
| 5 | End card, empty and error states | **done** |
| 6 | Video — autoplay policy, decoder budget, sound rule | **done** |
| 7 | Settings sheet, coach overlay, routing | **done** |
| 8 | Escorts skin against the real feed endpoint | **done** |
| 9 | Arrangements and Creator skins | **done** |

## Try it

Open `demo/index.html` on a phone. No build step, no server.

It is a behaviour prototype in plain JS mirroring the React source, so the scroll
can be felt before anything is wired up. The React source in `src/` is the real
thing; keep them in step or delete the demo once step 3 lands.

Debug readout, bottom left: active card, how many are mounted, how many are in
the DOM. Mounted should never exceed 5.

## What step 9 adds — and the verdict on the architecture

The test set in the spec was: *steps 1–8 are Escorts only and prove the whole
mechanic; step 9 should take days, not weeks. If it does not, the component was
not written shared and the work needs redoing before a third product compounds
it.*

**The numbers.** All three skins together are **355 lines out of 3,271** — 11%
of the package. Everything else is shared and was written once.

| Skin | Lines | What it actually contains |
|---|---|---|
| Escorts | 86 | Slots, the fetcher, the cities call |
| **Arrangements** | **67** | Slots and a fetcher. One word of copy differs. |
| Creator | 202 | A post header, a caption, the rail, the locked overlay |

Arrangements is 67 lines because it is the same unit as Escorts — a verified
person, near you, save or pass — so it composes the shared `PersonBody` and
changes a theme token set and one button label. Nothing else.

Creator is the honest cost of a genuinely different unit: the card contents and
the action layout change. The gesture layer, media stage, decoder budget, sound
rule, storage, location handling and end card are all the same code running
underneath it.

**Refactor made during this step, and it is the one that mattered:** the person
card body moved out of the Escorts skin into `cardParts.tsx`. Left where it
was, Arrangements would have been a 130-line copy, and the two would have
drifted the first time a verified badge changed. A copy is how three products
end up with three verified badges.

### The standing ruling, now enforced in code

**On Creator a pass means "not this post", never "not this creator."** Passes
and saves are keyed on item id, and on Creator an item id is a post id, so it
holds structurally. It is written into the file anyway, because the obvious
"improvement" is to mute the creator, and that would quietly strangle the
people you need posting.

### Creator specifics

- `showSingleSegment: true` — a post is one piece of media, so the bar would
  otherwise vanish. A single full segment keeps the chrome consistent with the
  multi-photo cards on the siblings
- Right-hand rail instead of a button row, because that is what every content
  feed has taught people to expect. Same actions underneath
- Locked posts blur in place. A locked post inside the feed converts better
  than any subscribe page, which is the whole reason the format is worth
  copying
- All of its CSS is additive — no shared rule is overridden, so Escorts and
  Arrangements are untouched by it

### Type-checks clean

`tsc --noEmit`, strict, `noUncheckedIndexedAccess`, zero errors, all 17 files.

## What step 8 adds

**Type-checks clean.** `tsc --noEmit` under `strict` and
`noUncheckedIndexedAccess`, zero errors across every file.

**`src/cardParts.tsx`** — the pieces every skin shares: verified badge, meta
line, tags, bio, action row. A skin composes these; it never reimplements them.
That is how three products avoid ending up with three verified badges that
drift apart.

**`src/skinEscorts.tsx`** — the entire product-specific surface, in one file:
card body, header chip, slots, and the fetcher that matches the live endpoint.
It is about 130 lines, and that number is the whole point. Arrangements is this
file with different tags and a different theme; Creator is this file with a post
instead of a person and a rail instead of a row.

**`examples/`** — drop-in wiring:

| File | What |
|---|---|
| `NearbyPage.tsx` | The complete `/nearby` page |
| `landing-routing.ts` | The one call the landing page makes |
| `mockFetchPage.ts` | Local dev without a backend. **Never ship it** |

### The action row finally closes the loop from step 3

`useCardActions()` was built in step 3 and unused until now. Buttons and
gestures run through the same functions, so they cannot drift — and the
asymmetry holds: the gesture saves and moves on, the heart toggles.

### First band is `anywhere`, deliberately

It needs no location, so nobody is asked for permission before they have a
reason to say yes. The prompt arrives when they pick a distance, which is the
moment it explains itself.

### What you will actually see

The real endpoint correctly returns nothing until a listing has an **approved
photo** — the feed requires one, because a monogram tile works at grid size and
dies full-screen. So this renders the empty state against production today.
That is right, not broken. `mockFetchPage` exists so the component can be seen
working in the meantime, and it must never reach production.

## What step 7 adds

**Settings sheet** behind the cog on every card: switch to the directory,
distance band, change location, video autoplay, saved count, flush. Escape
closes it — a sheet with no keyboard exit is a trap on desktop.

**Coach overlay**, shown once ever. Four gestures is one more than most people
absorb, which is exactly why scroll is the default and nothing else is
compulsory. The screen is a courtesy, not a dependency.

**Routing**, as an exported helper the landing page calls after render:

```ts
import { installFeedRouting } from '@ifantasy/feed';
installFeedRouting({ product: 'escorts', feedPath: '/nearby' });
```

- `/` always serves indexable HTML. The redirect is client-side, after render
- **Only the root redirects.** `/manchester`, `/safety`, `/p/:id` are honoured
  as asked for
- Device capability, never the user agent: `pointer: coarse` plus viewport
- `location.replace`, so the back button cannot ping-pong
- Switching to the directory sticks until the person switches back
- `?nofeed` escapes it, for debugging the landing page on a phone

### The one place a user-agent string is the right tool

Capability detection must never use the UA. Identifying a crawler is the
opposite case, and there is no other signal — **Googlebot executes JavaScript
and emulates a touch device**, so `pointer: coarse` is true for it. Without an
explicit bot check the crawler follows the redirect, indexes the feed instead of
the landing page, and the city pages lose the internal link they depend on.

## What step 6 adds

Real video, inside the same media set. Cards 3 and 6 in the demo carry a
clip — `demo/media/clip.mp4`, generated for the prototype and not shipped.

- **Autoplays muted, and loops.** Never advances the segment on its own —
  auto-advance rushes a decision the person is still making
- **Sound is off on every fresh session and never persists.** A module-level
  variable, deliberately: not localStorage, not sessionStorage, not the
  account. A fresh tab is a fresh decision. Someone who turns sound on at home
  and is outed on a bus three weeks later was failed by the software, so this
  is a safety rule wearing the clothes of a preference
- **No autoplay on data saver, a slow connection, or under reduced motion.**
  Poster frame, a play button, and a line saying why
- **Exactly one video element playing.** The active card's current segment.
  Everything else is paused, rewound and torn down; `preload="none"` means a
  card two away has downloaded nothing
- Leaving a card rewinds its clip, so returning starts it rather than resuming
  halfway through something nobody chose to leave
- Muting never restarts playback — the two are separate effects
- The sound control appears **only on a video segment**. A mute button on a
  photograph is noise
- Browsers refuse `play()` on their own judgement of gesture history. That is
  not an error: the poster is already showing, so it becomes a play button

### The segment bar fills from the video's clock

Not a timer. A timer drifts against a buffering video and the bar ends up lying
about where you are. A photo segment has no fill at all, because it has no
duration — it waits.

### Still deferred

Captions. Muted-by-default means no obligation today, but the moment Creator
ships talking video with sound enabled, captions stop being optional. Flagged,
not solved.

## Viewer location

The component asked for a distance band without ever saying what to measure
from. The Escorts session caught it while building the endpoint, and the guard
it wrote is the right permanent behaviour: `anywhere` works fully, and a
specific band with no origin returns **zero rather than widening**. Silently
returning people from 40 miles away when someone asked for 1 is the one failure
that destroys trust in the number on the end card.

**Client-sent. No IP geolocation** — it is new infrastructure, frequently wrong
by tens of miles, and being wrong about distance here is worse than asking.

### Rounded before it leaves the device

Two decimal places, about 1.1km, applied before the origin is stored and before
it is sent. Bands are 1, 5 and 10 miles, so a kilometre of slop changes nothing
except at an edge where the answer was arbitrary anyway.

The point is what it avoids: a precise log of where people were while browsing
this site is a sensitive dataset with no operational purpose, and the cheapest
way not to leak it is not to hold it. The provider side is unchanged — her band
still comes from her published broad area. Coarse origin, coarse area, both
ends blunt on purpose.

### Never asked for on load

A permission prompt the instant someone opens an escort directory is alarming,
it gets denied, and a denial is sticky for that origin — so a badly-timed ask
costs you the fallback as well. First visit defaults to `anywhere`, which needs
no origin. The prompt fires only on an explicit tap on a distance, with the
reason on the same screen.

Denied, unavailable or timed out → city picker, no automatic retry. Only cities
with verified listings are offered, same rule as city pages.

### Endpoint changes

In `ADDENDUM-B-viewer-location.md`: `lat`/`lng` on the feed request, a
`/api/feed/cities` endpoint, and the rule that coordinates are never stored.

## What step 5 adds

Three ways a feed stops, all designed rather than defaulted:

**EndCard** — you reached the bottom and there were some. States the real
number, offers to widen the band, to flush passes with the true hidden count,
and to be told when someone new verifies nearby. Closes on the rotation line.

**EmptyCard** — there were none to begin with. Not a blank, not a 404, not a
list with one odd card in it: a single screen that says nobody is verified here
yet and why that is deliberate.

**ErrorCard** — we could not ask. Retry, plus a route into the directory.
Never *"something went wrong"*: it tells the person nothing and implies they
might have caused it.

### Rules in here

- **Say the real number.** A short feed that states its own size reads as a
  standard being kept. A short feed that hides its size reads as a ghost town.
- **Never invent a count.** "Another 14 verified" appears only if the server
  sent `widerTotal`. Without it the card offers to widen and claims nothing.
- **No dead form.** The notify field only renders if the product supplied an
  `onNotify` handler. A field that swallows an address is worse than not
  asking.
- **Notify is inline.** Someone who has just been told there is nobody nearby
  will not survive a navigation to hand over an email.
- At `anywhere` there is nothing to widen to, so the copy changes rather than
  offering a dead option.

### Endpoint addition

`widerTotal` on the feed response — the count at the next band out. Optional.
Routed to the Escorts session as an addendum to the endpoint contract.

## Desktop — the column

Below 820px nothing changes: full bleed, exactly as before.

At 820px and up the feed letterboxes into a phone-shaped column, centred, with
a near-black surround. Instagram, TikTok and Reels all do this, and the reason
is not fashion: the card is composed for 9:16. Stretched across a monitor the
framing breaks, the type scale goes wrong, and the thumb-reach logic behind the
action row stops meaning anything.

- Column height tracks the window, width follows height at 9:16, clamped
  between 360px and 460px
- Surround is near-black, not pure black — pure black against a warm
  photograph reads as a rendering fault
- Every overlay anchors to the stage, not the window, so nothing floats out
  into the surround
- Safe-area insets are dropped inside the column; they are a phone concern

### Two controls on desktop, and they are not the same thing

**Back to the directory** sits outside the column, beside it. Someone on a
laptop arrived here from the site and expects a way back to it. On a phone
there is nothing behind the feed to close to, so it is hidden below 820px.

**Leave this site** stays where it always was, top right inside the column. It
leaves for a neutral site and kills the back button.

These must never be merged. Leave this site is a safety control and desktop is where
it matters most — a shared work computer is a likelier exposure than a phone.
If anything, the desktop case is the argument for keeping both.

### A bug found and fixed in the demo

The step 4 demo initialised its saves and passes *after* the first render, so
`hidden` was undefined when the pass filter ran. It threw on load. The state
block now sits above the render. Worth recording because the React source never
had the fault — it was an artefact of the plain-JS prototype, which is exactly
the kind of divergence that argues for deleting the demo once step 8 lands.

### The bug the desktop change would have caused

The commit threshold was 25% of **window** width. Inside a 440px column on a
1920px monitor that meant a swipe needed roughly three times the travel it
needs on a phone, and a flick would barely register. Thresholds now measure the
card, not the window.

## What step 4 adds

- Saves and passes, both device-local, both surviving a reload
- Save works signed out. An honest banner, shown once: *saved to this device*,
  or *saved for this visit only* when storage is not persisting
- Flush on the end card, showing the real hidden count. Clears passes, keeps
  saves
- A card passed this session shows a **Passed / Undo** marker rather than
  vanishing
- The heart reflects saved state and toggles; the gesture only ever saves

### Passes never reach a server

No network code exists in `storage.ts` or `useDecisions.ts` and none should be
added. A record of who was rejected and how often is precisely the data that
damages the people this platform exists to protect, and it is the first thing
anyone will add because it looks obviously useful. Keeping passes on the device
makes the guarantee structural rather than a policy someone later optimises
away. There is also no product callback on pass — only on save.

### The snapshot rule

Pages are filtered against the passes that existed **when the session started**,
never against the live set.

Filtering live would remove a card the instant it is passed, which changes the
scroll geometry under the person's thumb: the feed jumps and the person they
were about to look at is gone. So a card passed during this session stays
exactly where it is, marked and undoable, and simply does not come back next
time. Flush is the one exception — it is an explicit action from the end card,
so a reset to the top is expected.

### Storage fails more often than people assume

`localStorage` throws in Safari private browsing, with cookies blocked, inside
some in-app browsers, and on a full quota — both reading and writing. An
uncaught throw takes the feed down at the exact moment someone taps save.
Everything goes through a wrapper with an in-memory fallback, and the banner
tells the truth about which one is in use.

### One asymmetry, on purpose

The gesture saves; it never unsaves. Swiping right twice leaves a card saved.
The heart button is where you take it back. The gesture means *save and move
on*, the button means *manage this* — making the gesture a toggle would mean a
double-swipe silently undoes the thing someone just did.

## What step 3 adds

- Horizontal drag with axis locking at 10px. The axis locks once and never
  changes for that gesture, so a diagonal drag does exactly one thing
- Commits at 25% of viewport width **or** a flick over 0.5px/ms — a fast
  short swipe counts, which is how people actually swipe
- Rubber-band resistance past the commit point so a card never flies off
- SAVED and PASS stamps track the drag, so the outcome is visible before
  release. Nothing commits on a drag that springs back
- Buttons mirror every gesture. `S` saves, `X` passes, Enter opens
- Haptic on save only — a pass is a non-event and should not buzz
- **The card is never removed on a decision.** It sits in a scroll-snap
  list, and removing an element mid-scroll changes the geometry under the
  person's thumb. It springs back and the feed advances instead

### How drag and scroll coexist

`touch-action: pan-y` on the card. The browser keeps vertical panning — so
native scroll-snap, momentum and interruption all stay free — and horizontal
is reserved for us. Without it the browser starts a horizontal pan that cannot
be cancelled; with `none` we would have to reimplement vertical scrolling by
hand, badly.

When the browser claims a gesture as a vertical scroll it fires
`pointercancel`. Handling it is the difference between a card that springs
back cleanly and one that sticks half-dragged after a fast scroll.

### Two conflicts that had to be resolved

**Tap zones versus drag.** The media tap zones are buttons covering most of
the card. The gesture layer refuses to start a drag from a control — correct
in general, but it meant horizontal swipe only worked on the bottom third.
Tap zones are marked `data-drag-ok` and are the single exception.

**Drag versus click.** A committed swipe fires a click on release, which
advanced a photograph every time someone saved. A drag that moved sets a
suppression flag that eats the next click.

## What step 2 adds

- Segmented progress bar, one segment per media item, story pattern
- Tap the right two-thirds to advance, the left third to go back; wraps at
  both ends
- **Photos never auto-advance.** They wait. Auto-advancing rushes a decision
  the person is still making
- 140ms crossfade between segments, disabled under `prefers-reduced-motion`
- Tap zones stop 42% up the card, so a tap on the name, the tags or the action
  row never advances a photograph
- Video segments are modelled now — notch on the leading edge, poster rendered
  — with playback deferred to step 6. Building the segment model photo-only is
  how the progress bar ends up with two incompatible notions of duration
- Segment resets when a card leaves the **mount window**, not when it stops
  being active. Scrolling one past and back returns you where you were;
  genuinely leaving and returning starts at the cover
- Next photo in the set preloads once the card is active. Nothing preloads
  video for a segment nobody has reached
- Arrow left and right move segments

## What step 1 does

- Native CSS scroll-snap, `y mandatory`, `scroll-snap-stop: always` so a fast
  flick never skips a person
- `100dvh`, not `100vh` — on mobile Safari and Chrome the address bar collapses
  on scroll and `vh` stays frozen at the tallest value, which puts the snap
  point off-screen
- Every card shell stays in the DOM so scroll geometry is real; only media
  within 2 cards of the active one is mounted
- Active card via `IntersectionObserver` at 0.6 threshold, not a scroll handler
- Leave this site, `location.replace`, Escape twice, never tracked
- Arrow keys page the feed — every gesture gets a non-gesture equivalent
- End card renders as the final snap child

## What it deliberately does not do yet

No gestures, no video, no save or pass, no settings sheet, no routing. Those are
steps 2–7 and adding them early is how the gesture layer ends up tangled in the
scroll container.

## Install

```
"@ifantasy/feed": "git+https://github.com/<org>/ifantasy-feed.git#v0.1.0"
```

Do not copy this into the product repos. Three copies diverge within a month and
the third product inherits none of the fixes.

## Use

```tsx
import { FeedProvider, FeedViewport } from '@ifantasy/feed';
import '@ifantasy/feed/src/feed.css';

<FeedProvider config={{
  product: 'escorts',
  band: 'under 5 miles',
  directoryUrl: '/browse',
  fetchPage: ({ band, cursor, seed }) =>
    fetch(`/api/feed?band=${encodeURIComponent(band)}`
      + (cursor ? `&cursor=${cursor}` : '')
      + (seed ? `&seed=${seed}` : '')).then(r => r.json()),
}}>
  <FeedViewport slots={{
    renderHeader: (item) => <span className="fd__chip">{item.band}</span>,
    renderBody: (item) => <EscortsCardBody item={item} />,
  }} />
</FeedProvider>
```

## Rules the build holds to

Carried from the spec. Not open to reinterpretation — raise it, don't change it.

- Distance is a band string, computed from the published broad area. No number
  reaches the client in any field, including debug builds.
- `media[0]` is always a photograph. A video cover is a black rectangle while it
  buffers.
- The rotation seed is issued once and echoed back on every page. Without it the
  server reshuffles and the same person appears twice.
- Passes are device-local and never sent to the server.
- No pass analytics, anywhere, not even anonymised.
- Leave this site is never tracked.
