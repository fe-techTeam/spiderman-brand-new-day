import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";
import { vEnum } from "@/lib/server/validate";

// Moderation queue. Each row is one report; polymorphic content (post OR
// comment) is resolved via LEFT JOINs and flattened into a single DTO. Reports
// are gated by the same permission as the rest of forum moderation.
export async function GET(request) {
  const gate = await requireAdmin("forum.moderate");
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status")
    ? vEnum(sp.get("status"), ["open", "dismissed", "actioned"])
    : null;
  if (sp.get("status") && sp.get("status") !== "all" && !status) {
    return Response.json({ error: "Bad status" }, { status: 400 });
  }
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const where = [];
  const args = [];
  if (status) {
    where.push("r.status = ?");
    args.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT r.id, r.entity_type, r.entity_id, r.reason, r.status,
            r.created_at, r.resolved_at,
            reporter.username AS reporter_username,
            resolver.name AS resolver_name,
            -- post target
            p.title AS post_title, LEFT(p.body, 240) AS post_preview, p.status AS post_status,
            pu.username AS post_author, pu.id AS post_author_id,
            pu.status AS post_author_account, pu.takedown_count AS post_author_strikes,
            -- comment target
            LEFT(c.body, 240) AS comment_preview, c.status AS comment_status,
            cp.title AS comment_post_title, cp.id AS comment_post_id,
            cu.username AS comment_author, cu.id AS comment_author_id,
            cu.status AS comment_author_account, cu.takedown_count AS comment_author_strikes,
            (SELECT COUNT(*) FROM reports r2
              WHERE r2.entity_type = r.entity_type AND r2.entity_id = r.entity_id
                AND r2.status = 'open') AS entity_open_reports
     FROM reports r
     JOIN users reporter ON reporter.id = r.reporter_user_id
     LEFT JOIN admin_users resolver ON resolver.id = r.resolved_by
     LEFT JOIN posts p    ON r.entity_type = 'post'    AND p.id = r.entity_id
     LEFT JOIN users pu   ON pu.id = p.user_id
     LEFT JOIN comments c ON r.entity_type = 'comment' AND c.id = r.entity_id
     LEFT JOIN users cu   ON cu.id = c.user_id
     LEFT JOIN posts cp   ON cp.id = c.post_id
     ${whereSql}
     ORDER BY r.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    args
  );

  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM reports r ${whereSql}`,
    args
  );

  const items = rows.map((r) => {
    const isPost = r.entity_type === "post";
    return {
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      reporter: r.reporter_username,
      resolvedBy: r.resolver_name || null,
      entityOpenReports: Number(r.entity_open_reports || 0),
      // Flattened target — null when the row was hard-removed (shouldn't happen
      // with soft deletes, but keeps the UI defensive).
      content: {
        title: isPost ? r.post_title : r.comment_post_title,
        preview: isPost ? r.post_preview : r.comment_preview,
        status: isPost ? r.post_status : r.comment_status,
        postId: isPost ? r.entity_id : r.comment_post_id,
        author: isPost ? r.post_author : r.comment_author,
        authorAccount: isPost ? r.post_author_account : r.comment_author_account,
        authorStrikes: Number(
          (isPost ? r.post_author_strikes : r.comment_author_strikes) || 0
        ),
      },
    };
  });

  return Response.json({ items, total, page, limit });
}
