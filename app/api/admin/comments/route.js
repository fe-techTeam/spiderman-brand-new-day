import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { vEnum } from "@/lib/server/validate";

export async function GET(request) {
  const gate = await requireAdmin("forum.moderate");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 100);
  const status = sp.get("status") ? vEnum(sp.get("status"), ["active", "hidden", "deleted"]) : null;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const where = [];
  const args = [];
  if (q) {
    where.push("(c.body LIKE ? OR u.username LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    where.push("c.status = ?");
    args.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT c.id, LEFT(c.body, 200) AS body_preview, c.score, c.status,
            c.moderation_reason, c.created_at, c.post_id,
            u.id AS user_id, u.username, p.title AS post_title
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN posts p ON p.id = c.post_id
     ${whereSql}
     ORDER BY c.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    args
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM comments c JOIN users u ON u.id = c.user_id ${whereSql}`,
    args
  );

  return Response.json({ items: rows, total, page, limit });
}
