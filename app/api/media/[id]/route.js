// Public media streamer with visibility rules: a file is served only when its
// fan-art row is approved, OR the requester owns it, OR an admin session asks.
// Files live outside public/ so this check cannot be bypassed. BACKEND.md §10.

import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { query } from "@/lib/server/db";
import { verifyUserSession } from "@/lib/server/auth";
import { verifyAdminSession } from "@/lib/server/admin-auth";
import { vId } from "@/lib/server/validate";

export async function GET(request, { params }) {
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });

  const [media] = await query(
    `SELECT m.id, m.user_id, m.file_path, m.mime_type,
            (SELECT f.status FROM fan_art f WHERE f.media_id = m.id ORDER BY f.id DESC LIMIT 1) AS fan_art_status
     FROM media m WHERE m.id = ?`,
    [id]
  );
  if (!media) return Response.json({ error: "Not found" }, { status: 404 });

  let allowed = media.fan_art_status === "approved";
  if (!allowed) {
    const viewer = await verifyUserSession();
    allowed = viewer && Number(viewer.id) === Number(media.user_id);
  }
  if (!allowed) {
    const admin = await verifyAdminSession();
    allowed = Boolean(admin);
  }
  if (!allowed) return Response.json({ error: "Not found" }, { status: 404 });

  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
  const filePath = path.resolve(uploadRoot, media.file_path);
  if (!filePath.startsWith(uploadRoot + path.sep) || !existsSync(filePath)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { size } = await stat(filePath);
  return new Response(Readable.toWeb(createReadStream(filePath)), {
    headers: {
      "Content-Type": media.mime_type,
      "Content-Length": String(size),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": media.fan_art_status === "approved" ? "public, max-age=3600" : "private, no-store",
    },
  });
}
