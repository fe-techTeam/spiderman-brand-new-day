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

## July 2026 design refresh (live Claude Design project)

The design project was updated after the original export. Re-synced from the
live project via DesignSync; the following changed and were re-ported verbatim:

- **Spider-Verse Feed section redesigned** — the community pills + trending
  thread rows are gone. Now a centered hero over `forum-bg.jpg` with ambient FX
  (pulsing red/blue blooms, drifting motes, scan sheen) and a single big
  "Enter the Forum →" CTA (→ `/forum`). The live `/forum/posts?sort=hot` feed
  fetch was removed along with the thread list.
- **Spidey Tracker refreshed** — city-map background (`tracker-map-bg.jpg`),
  radar recolored to blue sweep/rings with bigger blips, radar enlarged and
  given a right margin, and a **77-frame sprite Spidey** (`spidey-strip.png`)
  swings in on a web line whenever the section enters view (IntersectionObserver
  re-arms it) with a dust burst + synthesized "land" thump (`lib/sfx.js`).
- **Footer added** (new full-viewport `data-page="footer"` section): Official
  Trailer showcase (copy + thumbnail that opens the trailer modal), About/Explore
  columns, social icons, legal bar. Becomes pager page index 6.
- **Nav reordered** to TRAILER · MJ WALL · FORUM · SPIDEY TRACKER; MJ WALL now
  navigates to `/mj-wall` (the detail page) instead of scrolling; FAN HUB removed
  from the nav (still reachable via footer Explore).
- **Trailer video changed** to `QdLExXYsyQw` (official Hindi trailer).
- **MJ Wall section**: textarea background `#000` → `#060e2a`; after a
  successful submit the page navigates to `/mj-wall` after 1.4s, handing the
  fresh message over via `localStorage.mj_pending_message` so it floats into
  the wall immediately.
- **MJ Wall detail page** (`MJ Wall.dc.html`, now exported) ported to
  `/mj-wall`: fixed-viewport "Living Memory Wall" — four marquee columns of
  memory cards (flow up/down, pause on hover, masked fades), heartbeat spider
  emblem, god-rays, cursor spotlight, faint MJ-portrait screen overlay
  (`mj-portrait.jpg`), card-expand modal, heart toggles, bottom composer
  (Enter posts). Replaces the previous card-grid page.

### Refresh deviations (with justification)

- **MJ Wall page is wired to the real API.** The wall renders approved messages
  from `GET /mj-wall/messages` (the mockup's 21 seeded messages remain only as
  the fallback while loading / when the API is empty). The composer POSTs to the
  API (auth + quiz gates apply, error text shown); the mockup posted nowhere.
- **Hearts are client-local.** There is no like API; live cards start at 0 and
  the toggle is per-visitor, matching the mockup's own local-only behavior.
  The seeded fallback keeps the mockup's fake counts.
- **Wall count keeps the mockup's formula** (`messages + 2456`) — consistent
  with the site's other fictional counters.
- **Sparse walls repeat their cards** (up to 8 rounds, ≥4 per column) so the
  marquee never looks empty with few real messages.
- **Moderation-status strip dropped.** The old `/mj-wall` showed the user's own
  submissions with pending/approved chips; the new fixed layout has no slot for
  it. A just-sent message floats in immediately client-side (server-side it is
  still pending approval).
- **`mjw-heartbeat` keyframes fixed**: the mockup animates `transform: scale()`
  only, which drops the emblem's inline `translate(-50%,-50%)` centering while
  the infinite animation runs (rendering it off-center — a mockup bug). Our
  keyframes include the translate so the emblem stays centered.
- **Mockup dead code dropped**: an unused `.bnd-play:hover` rule (no element
  uses the class) and the unused `lw-float` / `bnd-walk-grid` / `bnd-twin-grid`
  class hooks (no CSS anywhere in the project defines them).
- **MJ Wall page mobile**: 2 marquee columns under 760px (the mockup's fixed 4
  columns are unreadable on phones). Footer columns stack under 700px.
- **Spacebar removed from the pager keys** (user request): ArrowDown/PageDown
  still page; Space no longer advances a section.
- **Footer links wired per site conventions** where the mockup had `#`:
  Trailer → trailer modal, Fan Hub → the join flow (auth/quiz/forum), socials
  and legal links stay inert placeholders.
- **Asset caveats**: `tracker-map-bg.jpg` was re-encoded from the design asset's
  complete progressive scans (the API caps file reads at 256 KiB; visually
  identical, slightly softer). `trailer-thumb.jpg` uses the full-resolution
  YouTube `maxresdefault` for `QdLExXYsyQw`, which is pixel-identical to the
  design asset (verified by diff).

## Deliberate deviations (with justification)

1. **Missing pages → in-theme placeholders.** The source references
   `Signup.dc.html`, which was not exported (the link was broken in the
   original too). `/signup` renders a branded `ComingSoon` placeholder so
   navigation never dead-ends. (`MJ Wall.dc.html` has since shipped — see the
   July 2026 refresh above.)

2. **Two nav destinations corrected** (source had them mislabeled):
   - **MJ WALL** → scrolls to the MJ Wall section (source did `goToPage(1)`, the
     Identity section — clearly a bug for a link labeled "MJ WALL").
     *(Superseded by the July 2026 refresh: MJ WALL now → `/mj-wall`.)*
   - **FORUM** → `/forum` (source sent it to `Signup.dc.html`).
   - Unchanged: TRAILER → trailer modal;
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
`radar.png`, `cursor-spider.svg`, `spider-red.svg` (favicon), `AcuminPro-Regular.ttf`,
`forum-bg.jpg` (feed section), `tracker-map-bg.jpg` (tracker section),
`spidey-strip.png` (77-frame swing sprite), `trailer-thumb.jpg` (footer showcase),
`mj-portrait.jpg` (MJ Wall page overlay).

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
