import "./globals.css";
import SessionProvider from "@/components/auth/SessionProvider";
import CursorFx from "@/components/CursorFx";
import MusicPlayer from "@/components/main/MusicPlayer";
import InputScrollLock from "@/components/main/InputScrollLock";

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
      </head>
      <body>
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
