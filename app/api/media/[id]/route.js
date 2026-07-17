// Public media gateway with visibility rules: a file is served only when
//   - its fan-art row is approved, OR
//   - its live-feed row is approved, OR
//   - it is attached to an ACTIVE forum post, OR
//   - the requester owns it, OR an admin session asks.
// Storage (local disk or S3) is resolved per media row via lib/server/storage.

import { query } from "@/lib/server/db";
import { verifyUserSession } from "@/lib/server/auth";
import { verifyAdminSession } from "@/lib/server/admin-auth";
import { getObjectStream, parseRangeHeader } from "@/lib/server/storage";
import { vId } from "@/lib/server/validate";

// no-store on misses/denials: the same URL is later requested by the owner
// with cookies, and CloudFront would otherwise negative-cache the 404 and
// serve it to them (cookies are deliberately not part of the CDN cache key).
function notFound() {
  return Response.json(
    { error: "Not found" },
    { status: 404, headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function GET(request, { params }) {
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return notFound();

  const [media] = await query(
    `SELECT m.id, m.user_id, m.storage, m.file_path, m.mime_type,
            (SELECT f.status FROM fan_art f WHERE f.media_id = m.id ORDER BY f.id DESC LIMIT 1) AS fan_art_status,
            (SELECT lf.status FROM live_feed lf WHERE lf.media_id = m.id ORDER BY lf.id DESC LIMIT 1) AS live_feed_status,
            EXISTS(
              SELECT 1 FROM post_media pm JOIN posts p ON p.id = pm.post_id
              WHERE pm.media_id = m.id AND p.status = 'active'
            ) AS on_active_post
     FROM media m WHERE m.id = ?`,
    [id]
  );
  if (!media) return notFound();

  const isPublic =
    media.fan_art_status === "approved" ||
    media.live_feed_status === "approved" ||
    media.on_active_post === 1;
  let allowed = isPublic;
  if (!allowed) {
    const viewer = await verifyUserSession();
    allowed = viewer && Number(viewer.id) === Number(media.user_id);
  }
  if (!allowed) {
    const admin = await verifyAdminSession();
    allowed = Boolean(admin);
  }
  if (!allowed) return notFound();

  // Byte ranges (video seeking; Safari refuses to play without 206 support).
  const range = parseRangeHeader(request.headers.get("range"));
  const obj = await getObjectStream(media, range);
  if (!obj) return notFound();
  if (obj.unsatisfiable) {
    return new Response(null, {
      status: 416,
      headers: {
        ...(obj.total != null ? { "Content-Range": `bytes */${obj.total}` } : {}),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Public media: bytes at a key never change (random hex names), only the
  // visibility can be revoked — so let CloudFront hold them a day and browsers
  // an hour. Un-approving/deleting needs a CDN invalidation (DEPLOYMENT.md).
  // Owner/admin previews of pending media stay uncacheable.
  return new Response(obj.stream, {
    status: obj.range ? 206 : 200,
    headers: {
      "Content-Type": media.mime_type,
      "Accept-Ranges": "bytes",
      ...(obj.size != null ? { "Content-Length": String(obj.size) } : {}),
      ...(obj.range ? { "Content-Range": `bytes ${obj.range.start}-${obj.range.end}/${obj.total}` } : {}),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPublic
        ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
        : "private, no-store",
    },
  });
}
