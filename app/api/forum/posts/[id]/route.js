import { query } from "@/lib/server/db";
import { requireUser, verifyUserSession } from "@/lib/server/auth";
import { mediaForPosts, postDTO } from "@/lib/server/forum";
import { vId } from "@/lib/server/validate";

const SELECT = `
  SELECT p.id, p.title, p.body, p.is_spoiler, p.score, p.comment_count, p.created_at,
         u.username, c.handle AS community_handle, c.color AS community_color, f.label AS flair_label,
         pv.value AS my_vote
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN communities c ON c.id = p.community_id
  LEFT JOIN flairs f ON f.id = p.flair_id
  LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = ?
  WHERE p.id = ? AND p.status = 'active'`;

export async function GET(request, { params }) {
  const viewer = await verifyUserSession();
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });

  const [row] = await query(SELECT, [viewer?.id ?? 0, id]);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  const mediaMap = await mediaForPosts(query, [row.id]);
  return Response.json({ post: postDTO(row, mediaMap.get(row.id)) });
}

export async function DELETE(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });

  // Ownership enforced in the WHERE — no IDOR.
  const result = await query(
    "UPDATE posts SET status = 'deleted' WHERE id = ? AND user_id = ? AND status = 'active'",
    [id, gate.user.id]
  );
  if (result.affectedRows === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
