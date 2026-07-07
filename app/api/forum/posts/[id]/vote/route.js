import { withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { hotScore } from "@/lib/server/forum";
import { vId } from "@/lib/server/validate";

// direction is the DESIRED final state ("up" | "down" | null) — idempotent,
// so double-clicks and races settle correctly. BACKEND.md §13.2.
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
    // Lock the post first, then the vote row — consistent order, no deadlock.
    const [[post]] = await conn.execute(
      "SELECT id, score, created_at FROM posts WHERE id = ? AND status = 'active' FOR UPDATE",
      [id]
    );
    if (!post) return null;

    const [[vote]] = await conn.execute(
      "SELECT value FROM post_votes WHERE post_id = ? AND user_id = ? FOR UPDATE",
      [id, userId]
    );
    const current = vote?.value ?? 0;
    const delta = target - current;
    if (delta !== 0) {
      if (current === 0) {
        await conn.execute("INSERT INTO post_votes (post_id, user_id, value) VALUES (?, ?, ?)", [id, userId, target]);
      } else if (target === 0) {
        await conn.execute("DELETE FROM post_votes WHERE post_id = ? AND user_id = ?", [id, userId]);
      } else {
        await conn.execute("UPDATE post_votes SET value = ? WHERE post_id = ? AND user_id = ?", [target, id, userId]);
      }
      const newScore = post.score + delta;
      await conn.execute("UPDATE posts SET score = ?, hot_score = ? WHERE id = ?", [
        newScore,
        hotScore(newScore, post.created_at),
        id,
      ]);
      return { score: newScore };
    }
    return { score: post.score };
  });

  if (!out) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ score: out.score, myVote: body.direction ?? null });
}
