import "./globals.css";
import SessionProvider from "@/components/auth/SessionProvider";
import CursorFx from "@/components/CursorFx";

export const metadata = {
  title: "Spider-Man: Brand New Day",
  description:
    "Every Brand New Day starts with someone like you. Discover your Spider identity, find your Web Twins, and join the biggest web this world has ever seen.",
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
      </body>
    </html>
  );
}
