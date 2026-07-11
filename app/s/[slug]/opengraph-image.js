// OG card for the share landing: the identity's collectible card composited
// over the branded share art (public/assets/share-card.png — the Brand New
// Day logo survives the top-anchored 1200×630 crop), sized and compressed so
// WhatsApp (strict about preview image weight) always renders it. Lives under
// /s/ so robots.txt's /api disallow can't stop link scrapers from fetching
// it. sharp instead of next/og ImageResponse: the artwork IS the image — no
// text, no fonts, just compositing.

import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { query } from "@/lib/server/db";
import { activeDriver, getObjectStream } from "@/lib/server/storage";

export const alt = "Reveal your Spider identity — Spider-Man: Brand New Day";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const CACHE = { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };
const NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

async function cardBuffer(cardUrl) {
  const file = (cardUrl || "").split("/").pop() || "";
  if (!NAME_RE.test(file)) return null;
  const key = `avatar-cards/${file}`;
  // badge_asset stores only the URL — same dual-driver fallback as the
  // /api/avatar-cards route so cards survive a local↔S3 switch
  let obj = null;
  try {
    obj = await getObjectStream({ storage: activeDriver(), file_path: key });
  } catch {}
  if (!obj) {
    try {
      obj = await getObjectStream({ storage: activeDriver() === "s3" ? "local" : "s3", file_path: key });
    } catch {}
  }
  if (!obj) return null;
  return Buffer.from(await new Response(obj.stream).arrayBuffer());
}

async function stageBackground() {
  try {
    const art = await readFile(path.join(process.cwd(), "public", "assets", "share-card.png"));
    return await sharp(art).resize(1200, 630, { fit: "cover", position: "top" }).toBuffer();
  } catch {
    const thumb = await readFile(path.join(process.cwd(), "public", "assets", "trailer-thumb-62bIsvRcPv0.jpg"));
    return await sharp(thumb).resize(1200, 630, { fit: "cover" }).toBuffer();
  }
}

export default async function OgImage({ params }) {
  const { slug } = await params;
  let out;
  try {
    const rows = await query(
      "SELECT color, badge_asset AS card FROM avatars WHERE slug = ? AND is_active = 1",
      [String(slug || "")]
    );
    const av = rows[0];
    const raw = av && av.card ? await cardBuffer(av.card) : null;
    const bg = await stageBackground();
    if (raw) {
      const glow = /^#[0-9a-f]{6}$/i.test(av.color || "") ? av.color : "#ff3a4a";
      // both axes bounded: height-only would let very wide art exceed the
      // 1200px base and make composite() throw
      const card = await sharp(raw).resize({ width: 1100, height: 574, fit: "inside" }).png().toBuffer();
      // dim veil + identity-color glow so the card pops off the busy suit art
      const veil = Buffer.from(
        `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="g" cx="50%" cy="48%" r="52%">
              <stop offset="0%" stop-color="${glow}" stop-opacity="0.35"/>
              <stop offset="60%" stop-color="${glow}" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1200" height="630" fill="#07060c" fill-opacity="0.42"/>
          <rect width="1200" height="630" fill="url(#g)"/>
        </svg>`
      );
      out = await sharp(bg)
        .composite([
          { input: veil },
          { input: card, gravity: "centre" },
        ])
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } else {
      out = await sharp(bg).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    }
  } catch {
    try {
      out = await sharp(await stageBackground()).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } catch {
      out = await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#07060c" } })
        .jpeg({ quality: 82 })
        .toBuffer();
    }
  }
  return new Response(out, { headers: CACHE });
}
