import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { vId } from "@/lib/server/validate";

export async function DELETE(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });

  const ok = await withTransaction(async (conn) => {
    const [[comment]] = await conn.execute(
      "SELECT id, post_id FROM comments WHERE id = ? AND user_id = ? AND status = 'active' FOR UPDATE",
      [id, gate.user.id]
    );
    if (!comment) return false;
    // Hide any replies beneath it too — the UI has no tombstone treatment.
    const [res] = await conn.execute(
      "UPDATE comments SET status = 'deleted' WHERE id = ? OR (root_comment_id = ? AND status = 'active')",
      [id, id]
    );
    await conn.execute(
      "UPDATE posts SET comment_count = GREATEST(0, comment_count - ?) WHERE id = ?",
      [res.affectedRows, comment.post_id]
    );
    return true;
  });

  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
