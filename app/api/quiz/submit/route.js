import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { generateSpideyCode, scoreSubmission } from "@/lib/server/quiz";

export async function POST(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const user = gate.user;

  const body = await request.json().catch(() => ({}));
  let result;
  try {
    result = await scoreSubmission(body.answers);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  // Spidey code is minted once; retakes keep it.
  let spideyCode = user.spidey_code;
  await withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO quiz_submissions (user_id, answers, scores, assigned_avatar_id, tie_broken)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         answers = VALUES(answers), scores = VALUES(scores),
         assigned_avatar_id = VALUES(assigned_avatar_id), tie_broken = VALUES(tie_broken)`,
      [user.id, JSON.stringify(body.answers), JSON.stringify(result.scores), result.avatarId, result.tieBroken ? 1 : 0]
    );
    for (let attempt = 0; ; attempt++) {
      try {
        const code = spideyCode || generateSpideyCode();
        await conn.execute(
          `UPDATE users SET avatar_id = ?, spidey_code = ?, quiz_completed_at = NOW(3) WHERE id = ?`,
          [result.avatarId, code, user.id]
        );
        spideyCode = code;
        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && !spideyCode && attempt < 5) continue; // code collision → re-roll
        throw err;
      }
    }
  });

  const [avatar] = await query(
    "SELECT slug, name, emoji, tagline, description, color, badge_asset AS card FROM avatars WHERE id = ?",
    [result.avatarId]
  );
  return Response.json({
    avatar,
    spideyCode,
    tieBroken: result.tieBroken,
    scores: result.scores,
  });
}
