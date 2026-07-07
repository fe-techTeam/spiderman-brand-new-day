import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { vEnum } from "@/lib/server/validate";

export async function GET(request) {
  const gate = await requireAdmin("users.view");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 100);
  const status = sp.get("status") ? vEnum(sp.get("status"), ["active", "disabled"]) : null;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const where = [];
  const args = [];
  if (q) {
    where.push("(u.username LIKE ? OR u.email LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    where.push("u.status = ?");
    args.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT u.id, u.username, u.email, u.mobile, u.status, u.spidey_code, u.state, u.country,
            u.created_at, u.last_login_at, u.quiz_completed_at,
            a.name AS avatar_name, a.emoji AS avatar_emoji
     FROM users u LEFT JOIN avatars a ON a.id = u.avatar_id
     ${whereSql}
     ORDER BY u.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    args
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
    args
  );

  return Response.json({ items: rows, total, page, limit });
}
