// GET /api/twins — members who share your assigned identity (Web Twins).
// `count` is the full twin total; the roster is a fresh random draw per
// request, capped at 50 rows of { username, country }.

import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

const ROSTER_CAP = 50;

export async function GET() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id, avatar_id: avatarId } = gate.user;
  if (!avatarId) return Response.json({ count: 0, twins: [] });

  const [{ n }] = await query(
    "SELECT COUNT(*) AS n FROM users WHERE avatar_id = ? AND status = 'active' AND id <> ?",
    [avatarId, id]
  );
  const count = Number(n);
  const twins = count
    ? await query(
        `SELECT username, country FROM users
         WHERE avatar_id = ? AND status = 'active' AND id <> ?
         ORDER BY RAND() LIMIT ${ROSTER_CAP}`,
        [avatarId, id]
      )
    : [];
  return Response.json({ count, twins });
}
