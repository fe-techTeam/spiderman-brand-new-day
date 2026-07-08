// Serves avatar card artwork uploaded through the admin panel. Unlike user
// media there is no visibility rule — card art is site content shown on the
// identity reveal — so this streams straight from storage. Keys are random
// hex names minted by saveUpload, hence the immutable cache.

import { activeDriver, getObjectStream } from "@/lib/server/storage";

const NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

// no-store so CloudFront never negative-caches a card that is mid-upload.
function notFound() {
  return Response.json(
    { error: "Not found" },
    { status: 404, headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function GET(_request, { params }) {
  const { file } = await params;
  if (!NAME_RE.test(file || "")) return notFound();

  // badge_asset stores only the URL (no driver column) — try the active
  // driver first, then the other one so cards survive a local↔S3 switch.
  const key = `avatar-cards/${file}`;
  let obj = null;
  try {
    obj = await getObjectStream({ storage: activeDriver(), file_path: key });
  } catch {}
  if (!obj) {
    try {
      obj = await getObjectStream({
        storage: activeDriver() === "s3" ? "local" : "s3",
        file_path: key,
      });
    } catch {}
  }
  if (!obj) return notFound();

  return new Response(obj.stream, {
    headers: {
      "Content-Type": MIME[file.split(".").pop()],
      ...(obj.size != null ? { "Content-Length": String(obj.size) } : {}),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
