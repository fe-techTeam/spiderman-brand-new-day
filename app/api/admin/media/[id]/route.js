// Streams an uploaded file to authenticated admins (fan-art review previews).
// The public /api/media/[id] route (Phase 6) additionally checks approval status;
// admins may view any upload.

import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { vId } from "@/lib/server/validate";

export async function GET(request, { params }) {
  const gate = await requireAdmin("fanart.review");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const [media] = await query(
    "SELECT id, file_path, mime_type, size_bytes FROM media WHERE id = ?",
    [id]
  );
  if (!media) return Response.json({ error: "Not found" }, { status: 404 });

  // file_path is stored relative to the upload root; resolve + confine.
  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
  const filePath = path.resolve(uploadRoot, media.file_path);
  if (!filePath.startsWith(uploadRoot + path.sep) || !existsSync(filePath)) {
    return Response.json({ error: "File missing" }, { status: 404 });
  }

  const { size } = await stat(filePath);
  const stream = Readable.toWeb(createReadStream(filePath));
  return new Response(stream, {
    headers: {
      "Content-Type": media.mime_type,
      "Content-Length": String(size),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
