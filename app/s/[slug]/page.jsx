// Share landing — the URL that rides along when someone shares their Spider
// identity. Serves per-identity OG tags (the collectible card unfurls via
// ./opengraph-image.js), then the client redirector hands off to the landing
// page: members go to their Web Twins (The Living Web), guests and
// quiz-pending members to the "Who Are You Under the Mask?" section.

import { cache } from "react";
import { query } from "@/lib/server/db";
import ShareLanding from "./ShareLanding";

const SITE_NAME = "Spider-Man: Brand New Day";

// cache(): generateMetadata and the page render both need the row — one
// SELECT per request instead of two (fetch dedupe doesn't cover db calls)
const getAvatar = cache(async (slug) => {
  try {
    const rows = await query(
      "SELECT slug, name, emoji, tagline, color FROM avatars WHERE slug = ? AND is_active = 1",
      [String(slug || "")]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const av = await getAvatar(slug);
  const title = av ? `I'm ${av.name} — who are you under the mask?` : "Who are you under the mask?";
  const description = `${av && av.tagline ? `“${av.tagline}” ` : ""}Reveal your Spider identity and find your Web Twins on ${SITE_NAME}.`;
  return {
    title,
    description,
    // thin hand-off page — let crawlers follow through to the site instead
    robots: { index: false, follow: true },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: `/s/${(av && av.slug) || ""}`,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }) {
  const { slug } = await params;
  const av = await getAvatar(slug);
  return <ShareLanding name={(av && av.name) || null} color={(av && av.color) || null} />;
}
