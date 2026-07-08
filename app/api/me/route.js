import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { vString } from "@/lib/server/validate";

async function meDTO(userId) {
  const [row] = await query(
    `SELECT u.id, u.username, u.email, u.spidey_code, u.tagline, u.state, u.country,
            u.quiz_completed_at,
            a.name AS avatar_name, a.emoji AS avatar_emoji, a.tagline AS avatar_tagline,
            a.description AS avatar_description, a.color AS avatar_color, a.slug AS avatar_slug,
            a.badge_asset AS avatar_card, a.profile_asset AS avatar_pic
     FROM users u LEFT JOIN avatars a ON a.id = u.avatar_id
     WHERE u.id = ?`,
    [userId]
  );
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    spideyCode: row.spidey_code,
    tagline: row.tagline || row.avatar_tagline || null,
    state: row.state,
    country: row.country,
    needsQuiz: !row.quiz_completed_at,
    avatar: row.avatar_name
      ? {
          slug: row.avatar_slug,
          name: row.avatar_name,
          emoji: row.avatar_emoji,
          tagline: row.avatar_tagline,
          description: row.avatar_description,
          color: row.avatar_color,
          card: row.avatar_card,
          pic: row.avatar_pic, // identity profile picture (admin-managed)
        }
      : null,
  };
}

export async function GET() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  return Response.json({ user: await meDTO(gate.user.id) });
}

export async function PATCH(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const sets = [];
  const args = [];
  if (body.state !== undefined) {
    const v = body.state === null ? null : vString(body.state, { max: 100 });
    if (body.state !== null && !v) return Response.json({ error: "Bad state" }, { status: 400 });
    sets.push("state = ?");
    args.push(v);
  }
  if (body.country !== undefined) {
    const v = body.country === null ? null : vString(body.country, { max: 100 });
    if (body.country !== null && !v) return Response.json({ error: "Bad country" }, { status: 400 });
    sets.push("country = ?");
    args.push(v);
  }
  if (body.tagline !== undefined) {
    const v = body.tagline === null ? null : vString(body.tagline, { max: 160 });
    if (body.tagline !== null && !v) return Response.json({ error: "Bad tagline" }, { status: 400 });
    sets.push("tagline = ?");
    args.push(v);
  }
  if (!sets.length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  args.push(gate.user.id);
  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, args);
  return Response.json({ user: await meDTO(gate.user.id) });
}
