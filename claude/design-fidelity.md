# Design Fidelity — rules & deliberate deviations

Exact replication of the mockup is the priority. This file records every place the
port **intentionally** differs, and why. If you change fidelity behavior, update
this file.

## Faithfully reproduced

- All six home sections, both modals (walkthrough, trailer), the cinematic
  transition overlay, and the Forum — markup, inline styles, gradients, clip-paths,
  and copy are ported verbatim via the `s()` helper.
- Every `@keyframes` and hover effect (card sheen/lift, CTA sheen, emoji pop, twin
  reveal, red-body wash, nav glow, Marvel reveal-on-scroll).
- The world-map globe, identity particles, live-ticking counter with count-up,
  parallax on the hero/MJ layers, the custom spider cursor, and the synthesized
  WebAudio SFX + ambient hum — all ported 1:1.
- The desktop full-section pager with the film-shutter transition.

## Deliberate deviations (with justification)

1. **Missing pages → in-theme placeholders.** The source references
   `Signup.dc.html` and `MJ Wall.dc.html`, but neither was exported (the links were
   broken in the original too). `/signup` and `/mj-wall` render a branded
   `ComingSoon` placeholder so navigation never dead-ends. Real flows = Phase 2.

2. **Two nav destinations corrected** (source had them mislabeled):
   - **MJ WALL** → scrolls to the MJ Wall section (source did `goToPage(1)`, the
     Identity section — clearly a bug for a link labeled "MJ WALL").
   - **FORUM** → `/forum` (source sent it to `Signup.dc.html`).
   - Unchanged: TRAILER → trailer modal; FAN HUB → `/signup` (a "join" CTA);
     desktop SWING IN → Identity section; mobile SWING IN → `/signup` — all as source.
   Rationale: the brief explicitly asks to "set up proper navigation."

3. **Mobile uses natural scrolling instead of the touch pager.** The source hijacks
   touch to force a full-screen swipe pager on phones, which prevents scrolling
   within a section and can cut off the (auto-height) MJ Wall content. On `< 760px`
   the pager hijack is disabled and sections scroll naturally; nav actions
   smooth-scroll. All visuals/reveals are identical. The desktop pager is unchanged.
   Given "majority of users are on phones," this is the correct trade-off.

4. **Hero `bg.jpg` served via `next/image`.** The source uses a raw 8.6 MB `<img>`.
   We serve it through `next/image` (`fill`, responsive AVIF/WebP) — visually
   indistinguishable, dramatically lighter on mobile. All other images stay `<img>`.

5. **Forum made responsive.** The source Forum is a fixed 3-column desktop grid with
   no mobile handling. Added media queries (`globals.css`) to stack columns `< 900px`
   and trim the header `< 560px`. Desktop layout is untouched.

6. **`image-slot` reimplemented as a static placeholder** (`components/ImageSlot.jsx`).
   The source `<image-slot>` is an interactive upload widget; every slot ships empty.
   We render the empty-state look (dashed ring + icon + caption), tuned to read on
   the dark Forum cards (the source's dark-on-dark placeholder is ~invisible). Upload
   is Phase 2.

7. **Forum vote toggle implemented.** The source `renderVals` calls `this._vote(...)`
   but the method was not defined in the export (clicking a vote would throw). Added
   a standard up/down toggle so the UI works.

8. **Dropped dead code from the source** (unused in the rendered output): the
   `cityIndex` rotation, the `transStyle` switcher UI, `promoItems`, `mjTiles`,
   `identityNodes`, `webFeed`, `lightbox`, the OTP/`welcome` step markup, the
   hover-web cursor follower, and the several refs whose elements never existed.
   The visible result is identical.

## Additions beyond the mockup (Phase 1 feedback)

These were requested during Phase 1 and go beyond the exported design; they follow
the same visual language:

- **Pager:** one physical gesture = exactly one section (gesture stays "alive" through
  its inertial stream + the transition, ending only after ~350ms of wheel-idle); the
  film-shutter "blink" is snappier; no blink at the first/last boundary.
- **Forum simplified:** removed search, the navbar Create-Post button, member/online
  counts, Featured Creator, the Pinned flag, the thread-count, the left communities
  rail, and per-post category/tag. Sort is two plain tabs (New / Top). Sticky right
  sidebar (fixed by switching `overflow-x: hidden` → `clip` on html/body, which no
  longer breaks `position: sticky`).
- **Register/Login modal, post detail page, threaded replies + @mentions, notifications
  bell, working Share, empty states** — see `architecture.md`.
- **Custom animated cursor** was built then reverted at the user's request; the design's
  static spider-image cursor remains.

## Asset usage map (`public/assets/`)

Used: `bg.jpg` (hero, via next/image), `web.png` (overlays), `nav-logo.png`,
`logo.png`, `spiderman.png`, `identity-bg.jpg`, `mj-bg.jpg`, `tracker-logo.png`,
`radar.png`, `cursor-spider.svg`, `spider-red.svg` (favicon), `AcuminPro-Regular.ttf`.

Present but currently unused (kept for Phase 2 / parity): `form-bg.jpg`,
`spiderman-02.png`, `spidey-sprites.png`. Removed: `bg.png` (8 MB, unused),
`image-slot.js` (reimplemented).

## Verification checklist (run before shipping fidelity changes)

- [ ] No horizontal scroll at 360px, 390px, 768px, 1024px, 1440px.
- [ ] Hero entrance → walkthrough auto-opens (~6s) → closes cleanly.
- [ ] Identity CTA → `/signup`; Living Web → twin mode → back.
- [ ] MJ Wall textarea typewriter + submit "Sent!" state.
- [ ] Feed/forum links → `/forum`; Forum sort/filter/search/vote/create/load-more.
- [ ] Trailer modal opens/closes; Escape closes modals.
- [ ] Desktop pager (wheel/keys) vs. mobile natural scroll both feel right.
