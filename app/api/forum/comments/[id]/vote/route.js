import { withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { vId } from "@/lib/server/validate";

// Same set-state toggle semantics as post votes (no hot score on comments).
export async function POST(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const userId = gate.user.id;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (![null, "up", "down"].includes(body.direction ?? null)) {
    return Response.json({ error: "Bad direction" }, { status: 400 });
  }
  const target = body.direction === "up" ? 1 : body.direction === "down" ? -1 : 0;

  const out = await withTransaction(async (conn) => {
    const [[comment]] = await conn.execute(
      "SELECT id, score FROM comments WHERE id = ? AND status = 'active' FOR UPDATE",
      [id]
    );
    if (!comment) return null;

    const [[vote]] = await conn.execute(
      "SELECT value FROM comment_votes WHERE comment_id = ? AND user_id = ? FOR UPDATE",
      [id, userId]
    );
    const current = vote?.value ?? 0;
    const delta = target - current;
    if (delta !== 0) {
      if (current === 0) {
        await conn.execute("INSERT INTO comment_votes (comment_id, user_id, value) VALUES (?, ?, ?)", [id, userId, target]);
      } else if (target === 0) {
        await conn.execute("DELETE FROM comment_votes WHERE comment_id = ? AND user_id = ?", [id, userId]);
      } else {
        await conn.execute("UPDATE comment_votes SET value = ? WHERE comment_id = ? AND user_id = ?", [target, id, userId]);
      }
      await conn.execute("UPDATE comments SET score = score + ? WHERE id = ?", [delta, id]);
      return { score: comment.score + delta };
    }
    return { score: comment.score };
  });

  if (!out) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ score: out.score, myVote: body.direction ?? null });
}
