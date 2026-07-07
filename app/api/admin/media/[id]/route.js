// Streams any uploaded file to authenticated admins (review previews).
// The public /api/media/[id] route additionally checks approval status.

import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getObjectStream } from "@/lib/server/storage";
import { vId } from "@/lib/server/validate";

export async function GET(request, { params }) {
  const gate = await requireAdmin("fanart.review");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const [media] = await query(
    "SELECT id, storage, file_path, mime_type FROM media WHERE id = ?",
    [id]
  );
  if (!media) return Response.json({ error: "Not found" }, { status: 404 });

  const obj = await getObjectStream(media);
  if (!obj) return Response.json({ error: "File missing" }, { status: 404 });

  return new Response(obj.stream, {
    headers: {
      "Content-Type": media.mime_type,
      ...(obj.size != null ? { "Content-Length": String(obj.size) } : {}),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
