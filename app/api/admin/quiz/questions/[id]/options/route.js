import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vId, vString } from "@/lib/server/validate";

export async function POST(request, { params }) {
  const gate = await requireAdmin("quiz.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const questionId = vId(rawId);
  if (!questionId) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const text = vString(body.text, { max: 255 });
  const primaryAvatarId = vId(body.primaryAvatarId);
  const secondaryAvatarId = vId(body.secondaryAvatarId);
  if (!text || !primaryAvatarId || !secondaryAvatarId) {
    return Response.json(
      { error: "text, primaryAvatarId and secondaryAvatarId are required" },
      { status: 400 }
    );
  }

  const [q] = await query("SELECT id FROM quiz_questions WHERE id = ?", [questionId]);
  if (!q) return Response.json({ error: "Question not found" }, { status: 404 });

  const primaryPoints = Number.isInteger(body.primaryPoints) ? Math.min(10, Math.max(0, body.primaryPoints)) : 2;
  const secondaryPoints = Number.isInteger(body.secondaryPoints) ? Math.min(10, Math.max(0, body.secondaryPoints)) : 1;
  const position = Number.isInteger(body.position) ? body.position : 0;

  const result = await query(
    `INSERT INTO quiz_options
       (question_id, position, text, primary_avatar_id, secondary_avatar_id, primary_points, secondary_points)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [questionId, position, text, primaryAvatarId, secondaryAvatarId, primaryPoints, secondaryPoints]
  );
  await auditLog(gate.admin.id, "quiz.option.create", "quiz_option", result.insertId, {
    questionId,
    text,
    primaryAvatarId,
    secondaryAvatarId,
  });
  return Response.json({ ok: true, id: result.insertId }, { status: 201 });
}
