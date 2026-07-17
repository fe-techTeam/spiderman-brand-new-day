// Streams any uploaded file to authenticated admins (review previews).
// The public /api/media/[id] route additionally checks approval status.

import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getObjectStream, parseRangeHeader } from "@/lib/server/storage";
import { vId } from "@/lib/server/validate";

export async function GET(request, { params }) {
  // Any authenticated admin: review thumbnails are needed by whichever
  // moderation permission the viewer holds (fanart.review, livefeed.manage, …).
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const [media] = await query(
    "SELECT id, storage, file_path, mime_type FROM media WHERE id = ?",
    [id]
  );
  if (!media) return Response.json({ error: "Not found" }, { status: 404 });

  // Byte ranges (video seeking; Safari refuses to play without 206 support).
  const range = parseRangeHeader(request.headers.get("range"));
  const obj = await getObjectStream(media, range);
  if (!obj) return Response.json({ error: "File missing" }, { status: 404 });
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

  return new Response(obj.stream, {
    status: obj.range ? 206 : 200,
    headers: {
      "Content-Type": media.mime_type,
      "Accept-Ranges": "bytes",
      ...(obj.size != null ? { "Content-Length": String(obj.size) } : {}),
      ...(obj.range ? { "Content-Range": `bytes ${obj.range.start}-${obj.range.end}/${obj.total}` } : {}),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
