import { query, withTransaction } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { saveUpload } from "@/lib/server/uploads";
import { vEnum, vString } from "@/lib/server/validate";

// Moderation/management list. Pending queue is FIFO (oldest first), the rest
// newest first — same convention as fan art.
export async function GET(request) {
  const gate = await requireAdmin("livefeed.manage");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const status = vEnum(sp.get("status") || "pending", ["pending", "approved", "rejected", "hidden"]);
  if (!status) return Response.json({ error: "Bad status" }, { status: 400 });
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT lf.id, lf.status, lf.rejection_reason, lf.created_at, lf.reviewed_at,
            lf.media_id, lf.author_name, m.kind, m.mime_type, m.size_bytes,
            u.id AS user_id, u.username, au.name AS admin_name, r.name AS reviewed_by_name
     FROM live_feed lf
     JOIN media m ON m.id = lf.media_id
     LEFT JOIN users u ON u.id = lf.user_id
     LEFT JOIN admin_users au ON au.id = lf.admin_id
     LEFT JOIN admin_users r ON r.id = lf.reviewed_by
     WHERE lf.status = ?
     ORDER BY lf.id ${status === "pending" ? "ASC" : "DESC"}
     LIMIT ${limit} OFFSET ${offset}`,
    [status]
  );
  const [{ total }] = await query("SELECT COUNT(*) AS total FROM live_feed WHERE status = ?", [status]);

  return Response.json({ items: rows, total, page, limit });
}

// Admin upload — posts straight to the feed (no moderation pass for staff).
// One file per request; the panel loops for batches. An optional "author"
// attributes the drop to whoever it came from; blank falls back to "Spidey
// Admin" on the feed.
export async function POST(request) {
  const gate = await requireAdmin("livefeed.manage");
  if (gate.error) return gate.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  const rawAuthor = form.get("author");
  const authorName = typeof rawAuthor === "string" ? vString(rawAuthor, { max: 120 }) : null;

  let saved;
  try {
    saved = await saveUpload(file, "live-feed", { allowVideo: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const feedId = await withTransaction(async (conn) => {
    const [media] = await conn.execute(
      `INSERT INTO media (user_id, kind, storage, file_path, mime_type, size_bytes, width, height)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [saved.kind, saved.storage, saved.key, saved.mime, saved.size, saved.width, saved.height]
    );
    const [row] = await conn.execute(
      "INSERT INTO live_feed (admin_id, author_name, media_id, status) VALUES (?, ?, ?, 'approved')",
      [gate.admin.id, authorName, media.insertId]
    );
    return row.insertId;
  });

  await auditLog(gate.admin.id, "livefeed.upload", "live_feed", feedId, {
    kind: saved.kind,
    size: saved.size,
    author: authorName || undefined,
  });
  return Response.json({ id: feedId, status: "approved" }, { status: 201 });
}
