import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";

export async function GET(request) {
  const gate = await requireAdmin("audit.view");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const entity = (sp.get("entity") || "").trim().slice(0, 30);
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 25));
  const offset = (page - 1) * limit;

  const where = [];
  const args = [];
  if (entity) {
    where.push("l.entity_type = ?");
    args.push(entity);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT l.id, l.action, l.entity_type, l.entity_id, l.meta, l.created_at,
            a.name AS admin_name, a.email AS admin_email
     FROM admin_audit_logs l JOIN admin_users a ON a.id = l.admin_user_id
     ${whereSql}
     ORDER BY l.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    args
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM admin_audit_logs l ${whereSql}`,
    args
  );

  return Response.json({ items: rows, total, page, limit });
}
