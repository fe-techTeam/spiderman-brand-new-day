import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";

// Share log — who clicked Share and when (every click is its own row).
export async function GET(request) {
  const gate = await requireAdmin("shares.view");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 25));
  const offset = (page - 1) * limit;

  const items = await query(
    `SELECT s.id, s.created_at, u.username
     FROM shares s JOIN users u ON u.id = s.user_id
     ORDER BY s.id DESC
     LIMIT ${limit} OFFSET ${offset}`
  );
  const [{ total }] = await query("SELECT COUNT(*) AS total FROM shares");
  return Response.json({ items, total, page, limit });
}
