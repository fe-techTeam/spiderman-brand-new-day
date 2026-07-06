# Coding Standards

## Language & framework

- **Next.js App Router**, JavaScript with **JSX** (`.jsx`). No TypeScript.
- Next.js 16 (Turbopack by default) + React 19. Before using any Next API, check
  `node_modules/next/dist/docs/` — this Next version has breaking changes vs. older
  training data (async request APIs, `next/image` defaults, `middleware`→`proxy`,
  `next lint` removed, etc.). See `01-app/02-guides/upgrading/version-16.md`.
- Interactive pages/components are Client Components: put `"use client";` at the top.

## Styling — the `s()` / `sx()` helpers

The mockup uses verbatim inline `style="..."` strings. To replicate exactly
without hand-transcribing CSS into JS objects, we keep the **original CSS strings**
and convert them at render time:

```jsx
import { s } from "@/lib/style";
<div style={s("position: absolute; inset: 0; z-index: 2;")} />
```

- `s(cssString)` → React style object (mirrors the design runtime's `cssToObj`).
- `sx(...parts)` → merge several strings/objects (later wins).
- For dynamic values, build the string with a template literal:
  `s(\`background: ${color};\`)`.
- **Do not** convert style strings to hand-written objects — it defeats the point
  and invites transcription errors. Copy the CSS string from the source `.dc.html`.

### Global CSS (`app/globals.css`)

- Holds the design's entire `<style>` block **verbatim**: `@font-face`, all
  `@keyframes`, the reveal system (`.bnd-reveal`/`.bnd-line`/`.bnd-head`), card/CTA
  hover rules, the custom cursor, `::selection`, MJ mobile rules, and the Forum
  block (`.fm-*`).
- `style-hover="..."` attributes from the source are promoted to real `:hover`
  classes here (`.nav-link`, `.walk-card`, `.twin-card`, `.feed-thread`,
  `.feed-pill`, `.link-hover-red`). The element keeps its base inline style +
  `transition`; the class supplies only the hovered end-state.
- Asset URLs use root-absolute paths (`/assets/...`).

## Fonts

- **Oswald** via a Google Fonts `<link>` in `app/layout.jsx` (keeps the literal
  `font-family: "Oswald"` strings working exactly as the source).
- **Acumin Pro** via local `@font-face` in `globals.css` (`/assets/AcuminPro-Regular.ttf`).

## Images

- The 8.6 MB hero `bg.jpg` is served through **`next/image`** (`fill`, `priority`,
  `sizes="100vw"`) so phones get an auto AVIF/WebP responsive variant. This is the
  single biggest mobile win.
- All other images stay as plain `<img>` to preserve their exact filters, blend
  modes, and CSS animations. Files using `<img>` carry
  `/* eslint-disable @next/next/no-img-element */`.

## JS logic ported from the mockup

Canvas/audio/animation logic lives in `lib/` as framework-agnostic factories that
take a DOM node and return `{ destroy }`:

- `lib/globe.js` — the Living Web world-map canvas.
- `lib/particles.js` — the Identity section particle field.
- `lib/sfx.js` — synthesized WebAudio SFX + ambient hum.
- `lib/cities.js` — city list + lon/lat.
- `components/Flags.jsx` — the stylized flag/marker SVGs.

The big imperative block (parallax RAF, cinematic pager, reveal observer, live
counter, typewriter) lives in the mount `useEffect` of `app/page.jsx`, mirroring
the source `componentDidMount`. State that imperative handlers must read is
mirrored into refs (e.g. `isDesktopRef`, `walkOpenRef`) updated each render.

## Conventions

- Keep event-handler names and behaviors aligned with the source (`onWalkHover`,
  `onRevealTwin`, etc.).
- Escape/allow JSX text entities via a file-level
  `/* eslint-disable react/no-unescaped-entities */` when copying design copy verbatim.
- Clean up every listener/interval/RAF/observer in the effect's cleanup return.
- No new dependencies unless necessary — the port uses only Next + React.
