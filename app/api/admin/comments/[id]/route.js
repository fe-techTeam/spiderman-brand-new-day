import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEnum, vId, vString } from "@/lib/server/validate";

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

  const [comment] = await query("SELECT id, status FROM comments WHERE id = ?", [id]);
  if (!comment) return Response.json({ error: "Not found" }, { status: 404 });
  if (comment.status === "deleted") {
    return Response.json({ error: "Comment was deleted by its author" }, { status: 409 });
  }

  const status = action === "hide" ? "hidden" : "active";
  await query(
    `UPDATE comments SET status = ?, moderated_by = ?, moderated_at = NOW(3), moderation_reason = ?
     WHERE id = ?`,
    [status, gate.admin.id, action === "hide" ? reason : null, id]
  );
  await auditLog(gate.admin.id, `comment.${action}`, "comment", id, {
    from: comment.status,
    to: status,
    reason,
  });
  return Response.json({ ok: true, status });
}
