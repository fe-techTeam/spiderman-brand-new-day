import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { vEnum } from "@/lib/server/validate";

export async function GET(request) {
  const gate = await requireAdmin("fanart.review");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const status = vEnum(sp.get("status") || "pending", ["pending", "approved", "rejected", "hidden"]);
  if (!status) return Response.json({ error: "Bad status" }, { status: 400 });
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT f.id, f.title, f.description, f.status, f.rejection_reason, f.created_at, f.reviewed_at,
            f.media_id, m.mime_type, m.size_bytes,
            u.id AS user_id, u.username, r.name AS reviewed_by_name
     FROM fan_art f
     JOIN users u ON u.id = f.user_id
     JOIN media m ON m.id = f.media_id
     LEFT JOIN admin_users r ON r.id = f.reviewed_by
     WHERE f.status = ?
     ORDER BY f.id ${status === "pending" ? "ASC" : "DESC"}
     LIMIT ${limit} OFFSET ${offset}`,
    [status]
  );
  const [{ total }] = await query("SELECT COUNT(*) AS total FROM fan_art WHERE status = ?", [status]);

  return Response.json({ items: rows, total, page, limit });
}
