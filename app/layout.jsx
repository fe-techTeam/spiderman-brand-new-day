import "./globals.css";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import SessionProvider from "@/components/auth/SessionProvider";
import CursorFx from "@/components/CursorFx";
import MusicPlayer from "@/components/main/MusicPlayer";
import InputScrollLock from "@/components/main/InputScrollLock";

// Hard-coded (not env): NEXT_PUBLIC_ vars are inlined at build time, but the
// Docker build excludes .env* (.dockerignore) — an env-driven ID would silently
// drop analytics from production images. Both IDs are public in page source.
const GTM_ID = "GTM-K3CHLGTD";
const GA_ID = "G-7JY2WXJYLP";

const SITE_URL = "https://spidermania.in";
const SITE_NAME = "Spider-Man: Brand New Day";
const SITE_DESCRIPTION =
  "Every Brand New Day starts with someone like you. Discover your Spider identity, find your Web Twins, and join the biggest web this world has ever seen.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "./" }, // resolves per-route against metadataBase
  keywords: ["Spider-Man", "Brand New Day", "Spider World", "MJ Wall", "Spidey Tracker", "Marvel", "fan community"],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/assets/trailer-thumb-62bIsvRcPv0.jpg", width: 1280, height: 720, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/assets/trailer-thumb-62bIsvRcPv0.jpg"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/assets/spider-red.svg" },
  verification: { google: "X8BCwCcLl_TBKBirho_yBYL863vbn6l2Ghz-VHDuk24" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0c",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <GoogleTagManager gtmId={GTM_ID} />
      <GoogleAnalytics gaId={GA_ID} />
      <head>
        {/* Oswald loaded via <link> (as in the source mockup) so the literal
            `font-family: "Oswald"` strings resolve exactly. Acumin Pro is a
            local @font-face declared in globals.css. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Viewport-height shim for browsers WITHOUT dvh units (pre-2022 Safari/
            Chrome/WebViews): measures the real visible height into --bnd-vh,
            which the full-screen section rules in globals.css fall back to
            (height: calc(var(--bnd-vh) * 100)). Modern browsers bail on the
            first line and use 100dvh natively. Inline + blocking so the first
            paint on old browsers already has the correct height. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){if(window.CSS&&CSS.supports&&CSS.supports('height','100dvh'))return;var d=document.documentElement;function set(){if(d.classList.contains('bnd-kb-lock'))return;var h=(window.visualViewport&&window.visualViewport.height)||window.innerHeight;d.style.setProperty('--bnd-vh',h*0.01+'px')}set();window.addEventListener('resize',set);window.addEventListener('orientationchange',set)})();",
          }}
        />
      </head>
      <body>
        {/* GTM fallback for no-JS visitors — the <script> half is rendered by
            <GoogleTagManager>, which does not emit this iframe itself. */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <SessionProvider>{children}</SessionProvider>
        <CursorFx />
        {/* Mobile: freeze page scroll while a text field is focused (see
            component docblock). Root-mounted so every route gets it. */}
        <InputScrollLock />
        {/* Mounted at the root so the score keeps playing across every route
            (landing → onboarding → forum → MJ wall) instead of restarting. */}
        <MusicPlayer />
      </body>
    </html>
  );
}
