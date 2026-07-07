import { query, withTransaction } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vId, vString } from "@/lib/server/validate";

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("quiz.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const [q] = await query("SELECT id FROM quiz_questions WHERE id = ?", [id]);
  if (!q) return Response.json({ error: "Not found" }, { status: 404 });

  const sets = [];
  const args = [];
  if (body.text !== undefined) {
    const text = vString(body.text, { max: 255 });
    if (!text) return Response.json({ error: "Bad text" }, { status: 400 });
    sets.push("text = ?");
    args.push(text);
  }
  if (body.position !== undefined && Number.isInteger(body.position)) {
    sets.push("position = ?");
    args.push(body.position);
  }
  if (body.isActive !== undefined) {
    sets.push("is_active = ?");
    args.push(body.isActive ? 1 : 0);
  }

  if (body.isTiebreaker === true) {
    // Exactly one tie-breaker question at a time.
    await withTransaction(async (conn) => {
      await conn.execute("UPDATE quiz_questions SET is_tiebreaker = 0 WHERE is_tiebreaker = 1");
      await conn.execute("UPDATE quiz_questions SET is_tiebreaker = 1 WHERE id = ?", [id]);
    });
  }
  if (sets.length) {
    args.push(id);
    await query(`UPDATE quiz_questions SET ${sets.join(", ")} WHERE id = ?`, args);
  }

  await auditLog(gate.admin.id, "quiz.question.update", "quiz_question", id, body);
  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const gate = await requireAdmin("quiz.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  // Soft-disable, never hard-delete: quiz_submissions snapshots reference option ids.
  await query("UPDATE quiz_questions SET is_active = 0 WHERE id = ?", [id]);
  await auditLog(gate.admin.id, "quiz.question.deactivate", "quiz_question", id, null);
  return Response.json({ ok: true });
}
