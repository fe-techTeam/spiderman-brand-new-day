// Avatar-quiz engine: public quiz shape, weighted scoring with the Brand New Day
// tie-breaker, and spidey-code generation. See BACKEND.md §6.

import { query } from "@/lib/server/db";

/** Active questions + options for the portal — mapping (avatar ids) stripped. */
export async function getActiveQuiz() {
  const questions = await query(
    "SELECT id, position, text, is_tiebreaker FROM quiz_questions WHERE is_active = 1 ORDER BY position, id"
  );
  const options = await query(
    `SELECT o.id, o.question_id, o.position, o.text
     FROM quiz_options o JOIN quiz_questions q ON q.id = o.question_id
     WHERE o.is_active = 1 AND q.is_active = 1
     ORDER BY o.question_id, o.position, o.id`
  );
  const byQ = new Map(questions.map((q) => [q.id, { id: q.id, text: q.text, options: [] }]));
  for (const o of options) byQ.get(o.question_id)?.options.push({ id: o.id, text: o.text });
  return [...byQ.values()].filter((q) => q.options.length > 0);
}

/**
 * Scores a submission. answers = [{questionId, optionId}].
 * Returns { avatarId, scores, tieBroken } or throws Error with a user-safe message.
 */
export async function scoreSubmission(answers) {
  if (!Array.isArray(answers) || answers.length === 0) throw new Error("No answers submitted");

  const questions = await query(
    "SELECT id, is_tiebreaker FROM quiz_questions WHERE is_active = 1"
  );
  const activeIds = new Set(questions.map((q) => q.id));
  const tiebreakerId = questions.find((q) => q.is_tiebreaker === 1)?.id ?? null;

  const seen = new Set();
  for (const a of answers) {
    if (!a || !activeIds.has(Number(a.questionId)) || seen.has(Number(a.questionId))) {
      throw new Error("Invalid answers");
    }
    seen.add(Number(a.questionId));
  }
  if (seen.size !== activeIds.size) throw new Error("Answer every question");

  const optionIds = answers.map((a) => Number(a.optionId));
  const options = await query(
    `SELECT o.id, o.question_id, o.primary_avatar_id, o.secondary_avatar_id,
            o.primary_points, o.secondary_points
     FROM quiz_options o
     WHERE o.id IN (${optionIds.map(() => "?").join(",")}) AND o.is_active = 1`,
    optionIds
  );
  const byId = new Map(options.map((o) => [o.id, o]));

  const scores = {}; // avatarId -> points
  const add = (avatarId, pts) => {
    scores[avatarId] = (scores[avatarId] || 0) + pts;
  };
  let tiebreakerOption = null;
  for (const a of answers) {
    const opt = byId.get(Number(a.optionId));
    if (!opt || opt.question_id !== Number(a.questionId)) throw new Error("Invalid answers");
    add(opt.primary_avatar_id, opt.primary_points);
    add(opt.secondary_avatar_id, opt.secondary_points);
    if (opt.question_id === tiebreakerId) tiebreakerOption = opt;
  }

  const max = Math.max(...Object.values(scores));
  let leaders = Object.keys(scores)
    .filter((id) => scores[id] === max)
    .map(Number);

  let tieBroken = false;
  if (leaders.length > 1 && tiebreakerOption) {
    // The Brand New Day question settles draws: its primary avatar wins among
    // the tied leaders, then its secondary.
    for (const pick of [tiebreakerOption.primary_avatar_id, tiebreakerOption.secondary_avatar_id]) {
      if (leaders.includes(pick)) {
        leaders = [pick];
        tieBroken = true;
        break;
      }
    }
  }
  if (leaders.length > 1) {
    // Deterministic final fallback: lowest sort_order, then id — never random.
    const rows = await query(
      `SELECT id FROM avatars WHERE id IN (${leaders.map(() => "?").join(",")})
       ORDER BY sort_order, id LIMIT 1`,
      leaders
    );
    leaders = [rows[0].id];
    tieBroken = true;
  }

  return { avatarId: leaders[0], scores, tieBroken };
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L ambiguity

export function generateSpideyCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `BND-${code}`;
}
