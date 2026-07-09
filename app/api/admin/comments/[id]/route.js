import { query, withTransaction } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEnum, vId, vString } from "@/lib/server/validate";
import { recountPostComments } from "@/lib/server/forum";

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("forum.moderate");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = vEnum(body.action, ["hide", "unhide"]);
  if (!action) return Response.json({ error: "Bad action" }, { status: 400 });
  const reason = body.reason ? vString(body.reason, { max: 255 }) : null;

  const [comment] = await query("SELECT id, post_id, status FROM comments WHERE id = ?", [id]);
  if (!comment) return Response.json({ error: "Not found" }, { status: 404 });
  if (comment.status === "deleted") {
    return Response.json({ error: "Comment was deleted by its author" }, { status: 409 });
  }

  const status = action === "hide" ? "hidden" : "active";
  await withTransaction(async (conn) => {
    if (action === "hide") {
      // Cascade to still-active replies so a hidden root doesn't leave orphaned
      // replies counted-but-invisible in the thread.
      await conn.execute(
        `UPDATE comments SET status = 'hidden', moderated_by = ?, moderated_at = NOW(3), moderation_reason = ?
         WHERE (id = ? OR root_comment_id = ?) AND status = 'active'`,
        [gate.admin.id, reason, id, id]
      );
    } else {
      // Unhide restores just the targeted comment (a whole-subtree restore isn't
      // a modeled action); recount keeps the counter matching what's visible.
      await conn.execute(
        `UPDATE comments SET status = 'active', moderated_by = ?, moderated_at = NOW(3), moderation_reason = NULL
         WHERE id = ? AND status = 'hidden'`,
        [gate.admin.id, id]
      );
    }
    // Keep the forum card badge in sync with the thread's live comment total.
    await recountPostComments(conn, comment.post_id);
  });
  await auditLog(gate.admin.id, `comment.${action}`, "comment", id, {
    from: comment.status,
    to: status,
    reason,
  });
  return Response.json({ ok: true, status });
}
