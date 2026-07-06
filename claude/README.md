# Spider-Man: Brand New Day — Project Rules

This directory is the source of truth for **rules and coding standards** on this
project. Read it before making changes. Files:

- [`coding-standards.md`](./coding-standards.md) — how to write code here.
- [`architecture.md`](./architecture.md) — file layout and how the port works.
- [`design-fidelity.md`](./design-fidelity.md) — fidelity rules + every deliberate
  deviation from the source mockup, with justification.

## What this is

A pixel-faithful **Next.js (App Router, JSX)** replica of the "Spider-Man: Brand
New Day" Claude Design mockup. It is a cinematic single-page microsite plus a
Reddit-style forum.

Source mockup: `~/Downloads/Spiderman Brand New Day/` (`.dc.html` files rendered
by `support.js`, a React-based runtime). The `.dc.html` templates are already
React under the hood, so this is a faithful port of that component logic into
idiomatic React hooks + JSX.

## Phase status

- **Phase 1 (this work): DONE** — perfect replication of the design, all assets,
  navigation, hover effects, transitions, and mobile responsiveness. **No backend.**
- **Phase 2 (later):** the expected flow (auth/OTP, MJ Wall gallery, real forum
  data, persistence) — to be specified in a separate markdown file. Do not add a
  backend until then.

## Ground rules (summary)

1. **Exact visual replication is the priority.** Match the mockup. Where the
   source is clearly broken or desktop-only, correct minimally and record it in
   `design-fidelity.md`.
2. **Mobile-first.** Most users are on phones. Every change must be verified on a
   narrow viewport. Never let the page scroll horizontally.
3. **App Router + JSX only** (no TypeScript, no Pages Router).
4. **No backend in Phase 1.** No API routes, no DB, no server actions.
5. **Keep styles verbatim** via the `s()` helper — see coding standards.
