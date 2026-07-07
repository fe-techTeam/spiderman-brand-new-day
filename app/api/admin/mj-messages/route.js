import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { vEnum } from "@/lib/server/validate";

export async function GET(request) {
  const gate = await requireAdmin("mj.review");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const status = vEnum(sp.get("status") || "pending", ["pending", "approved", "rejected", "hidden"]);
  if (!status) return Response.json({ error: "Bad status" }, { status: 400 });
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT m.id, m.body, m.status, m.is_featured, m.rejection_reason, m.created_at, m.reviewed_at,
            u.id AS user_id, u.username, r.name AS reviewed_by_name
     FROM mj_messages m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN admin_users r ON r.id = m.reviewed_by
     WHERE m.status = ?
     ORDER BY m.id ${status === "pending" ? "ASC" : "DESC"}
     LIMIT ${limit} OFFSET ${offset}`,
    [status]
  );
  const [{ total }] = await query(
    "SELECT COUNT(*) AS total FROM mj_messages WHERE status = ?",
    [status]
  );

  return Response.json({ items: rows, total, page, limit });
}
