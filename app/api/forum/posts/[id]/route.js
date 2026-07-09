import { query } from "@/lib/server/db";
import { requireUser, verifyUserSession } from "@/lib/server/auth";
import { mediaForPosts, postDTO } from "@/lib/server/forum";
import { vId, vString } from "@/lib/server/validate";
import { containsProfanity, profanityResponse } from "@/lib/server/profanity";

const SELECT = `
  SELECT p.id, p.title, p.body, p.is_spoiler, p.score, p.comment_count, p.created_at, p.edited_at,
         u.username, av.profile_asset AS author_avatar_pic,
         c.handle AS community_handle, c.color AS community_color, f.label AS flair_label,
         pv.value AS my_vote
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN avatars av ON av.id = u.avatar_id
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

export async function PATCH(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = vString(body.title, { min: 3, max: 300 });
  const text = vString(body.body, { min: 1, max: 10000 });
  if (!title || !text) {
    return Response.json({ error: "Title (3+ chars) and body are required" }, { status: 400 });
  }
  if (containsProfanity(title, text)) return profanityResponse("post");

  // Ownership enforced in the WHERE — no IDOR. The row is overwritten in
  // place (no version history); edited_at only ever holds the latest edit.
  const result = await query(
    "UPDATE posts SET title = ?, body = ?, edited_at = NOW(3) WHERE id = ? AND user_id = ? AND status = 'active'",
    [title, text, id, gate.user.id]
  );
  if (result.affectedRows === 0) return Response.json({ error: "Not found" }, { status: 404 });

  const [row] = await query(SELECT, [gate.user.id, id]);
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
