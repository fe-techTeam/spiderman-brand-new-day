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
    where.push("(p.title LIKE ? OR u.username LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    where.push("p.status = ?");
    args.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT p.id, p.title, LEFT(p.body, 200) AS body_preview, p.is_spoiler, p.score,
            p.comment_count, p.status, p.moderation_reason, p.created_at,
            u.id AS user_id, u.username, c.handle AS community
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN communities c ON c.id = p.community_id
     ${whereSql}
     ORDER BY p.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    args
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM posts p JOIN users u ON u.id = p.user_id ${whereSql}`,
    args
  );

  return Response.json({ items: rows, total, page, limit });
}
