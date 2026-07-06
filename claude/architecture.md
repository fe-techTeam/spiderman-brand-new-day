# Architecture

## Routes (App Router)

| Route       | File                       | Source `.dc.html`              | Notes |
|-------------|----------------------------|--------------------------------|-------|
| `/`          | `app/page.jsx`            | `Spider-Man Brand New Day`     | The cinematic single-page experience (6 sections + modals). Client Component. |
| `/forum`     | `app/forum/page.jsx`      | `Spider-Verse Forum`           | Reddit-style forum list. Client Component. |
| `/forum/[id]`| `app/forum/[id]/page.jsx` | (added per feedback)           | Post detail: full post + threaded comments, replies, @mentions, share. |
| `/signup`    | `app/signup/page.jsx`     | `Signup.dc.html` (not exported)| In-theme placeholder → Phase 2. |
| `/mj-wall`   | `app/mj-wall/page.jsx`    | `MJ Wall.dc.html` (not exported)| In-theme placeholder → Phase 2. |

`app/layout.jsx` — root layout, Oswald `<link>`, metadata/viewport, `globals.css`.
`app/forum/layout.jsx` — wraps all `/forum` routes with `ForumProvider` (notifications
store) + the shared sticky `ForumHeader` (logo, centered title, notifications bell, avatar).

## Forum interactivity (added during Phase 1 feedback)

- **Register/Login modal** (`components/main/AuthModal.jsx`) — opened by SWING IN and
  every join CTA (`goToForm`). Fields: Username, Email, Mobile, Password (login = Email +
  Password). No backend — submit just closes.
- **Post detail** — vote rails, threaded comment replies, `@mention` prefill + red
  highlight (`Body` renderer), a working **Share** (`lib/share.js` → Web Share API or
  clipboard; shares title + first line + URL, no image), and empty states.
- **Notifications** (`components/forum/ForumProvider.jsx` + bell in `ForumHeader`) —
  pulsing red badge; only for replies-to-you / comments-on-your-post (never upvotes).
  Posting a comment/reply simulates an incoming reply notification.
- **Empty states** — `components/forum/EmptyState.jsx` (no posts) and an inline
  "no comments yet" state, ready for when the real backend returns empty lists.

## The home page (`app/page.jsx`)

One Client Component that reproduces the source React component:

- **Sections** (each a `[data-page]` element, 100vh): `hero`, `identity`,
  `livingweb`, `mjwall`, `feed`, `tracker`.
- **State** mirrors the source `state`: `walkOpen`, `trailerOpen`, `isDesktop`,
  `mobileMenuOpen`, `mjMessage`, `mjSent`, `livingCount`, `countAnim`, `twinMode`.
  (`cityIndex`/`transStyle` from the source are dropped/fixed — see design-fidelity.)
- **Mount `useEffect`** = the source `componentDidMount`: parallax RAF (`kickRAF`),
  pointer/scroll/resize/key listeners, WebAudio unlock, walkthrough auto-open timer
  (~6.2s), live-counter interval, globe + particle init, reveal `IntersectionObserver`
  (also triggers the counter count-up), the full-section pager with five cinematic
  transitions (shutter is active; dissolve under reduced-motion), and the MJ
  typewriter placeholder. Everything is torn down in the cleanup return.
- **Composed components:** `components/main/Nav.jsx`, `WalkthroughModal.jsx`,
  `TrailerModal.jsx`. Sections stay inline in `page.jsx` because they own DOM refs
  the effect drives (`bgRef`, `globeRef`, `mjWallRef`, …).

### Navigation model

- **Desktop:** the cinematic full-section pager (wheel / arrow keys / touch),
  hijacking scroll with shutter transitions — exactly like the source.
- **Mobile (`< 760px`):** natural vertical scrolling (pager hijack disabled). Nav
  actions smooth-scroll to the target section. Scroll-snap is off on mobile (per the
  source CSS). This is a deliberate mobile improvement — see design-fidelity.

## `lib/`

- `style.js` — `s()` / `sx()` CSS-string → style-object helpers.
- `cities.js`, `globe.js`, `particles.js`, `sfx.js` — ported canvas/audio logic
  (factories returning `{ destroy }`), imported and initialized by the home page.

## `components/`

- `Flags.jsx` — `<Flag code>` + `<DotMarker>` SVGs.
- `ImageSlot.jsx` — static dark placeholder standing in for the source
  `<image-slot>` custom element (used on the Forum). Image upload is Phase 2.
- `ComingSoon.jsx` — in-theme placeholder shell for `/signup` and `/mj-wall`.
- `main/` — `Nav`, `WalkthroughModal`, `TrailerModal`.

## `public/assets/`

All design assets (images, `cursor-spider.svg`, `AcuminPro-Regular.ttf`). The
unused 8 MB `bg.png` and the `image-slot.js` runtime were dropped (`image-slot` is
reimplemented in React). See `claude/design-fidelity.md` for the asset-usage map.
