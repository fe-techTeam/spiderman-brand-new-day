import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vString } from "@/lib/server/validate";

export async function GET() {
  const gate = await requireAdmin("quiz.manage");
  if (gate.error) return gate.error;

  const questions = await query(
    "SELECT id, position, text, is_tiebreaker, is_active FROM quiz_questions ORDER BY position, id"
  );
  const options = await query(
    `SELECT o.id, o.question_id, o.position, o.text,
            o.primary_avatar_id, o.secondary_avatar_id, o.primary_points, o.secondary_points, o.is_active,
            pa.name AS primary_name, pa.emoji AS primary_emoji,
            sa.name AS secondary_name, sa.emoji AS secondary_emoji
     FROM quiz_options o
     JOIN avatars pa ON pa.id = o.primary_avatar_id
     JOIN avatars sa ON sa.id = o.secondary_avatar_id
     ORDER BY o.question_id, o.position, o.id`
  );

  const byQuestion = new Map(questions.map((q) => [q.id, { ...q, options: [] }]));
  for (const o of options) byQuestion.get(o.question_id)?.options.push(o);
  return Response.json({ questions: [...byQuestion.values()] });
}

export async function POST(request) {
  const gate = await requireAdmin("quiz.manage");
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const text = vString(body.text, { max: 255 });
  if (!text) return Response.json({ error: "Question text required" }, { status: 400 });
  const position = Number.isInteger(body.position) ? body.position : 0;

  const result = await query(
    "INSERT INTO quiz_questions (position, text, is_active) VALUES (?, ?, 1)",
    [position, text]
  );
  await auditLog(gate.admin.id, "quiz.question.create", "quiz_question", result.insertId, { text });
  return Response.json({ ok: true, id: result.insertId }, { status: 201 });
}
