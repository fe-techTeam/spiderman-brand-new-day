import { query, withTransaction } from "@/lib/server/db";
import { requireUser, verifyUserSession } from "@/lib/server/auth";
import { commentDTO, parseMentions } from "@/lib/server/forum";
import { createNotification, notifyMentions } from "@/lib/server/notify";
import { vId, vString } from "@/lib/server/validate";
import { containsProfanity, profanityResponse } from "@/lib/server/profanity";
import { rateLimit } from "@/lib/server/rate-limit";
import { postingBlockedResponse } from "@/lib/server/moderation";

const SELECT = `
  SELECT c.id, c.body, c.score, c.created_at, c.parent_comment_id, c.root_comment_id,
         u.username, av.profile_asset AS author_avatar_pic,
         ru.username AS reply_to_username, cv.value AS my_vote
  FROM comments c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN avatars av ON av.id = u.avatar_id
  LEFT JOIN users ru ON ru.id = c.reply_to_user_id
  LEFT JOIN comment_votes cv ON cv.comment_id = c.id AND cv.user_id = ?`;

export async function GET(request, { params }) {
  const viewer = await verifyUserSession();
  const { id: rawId } = await params;
  const postId = vId(rawId);
  if (!postId) return Response.json({ error: "Not found" }, { status: 404 });

  // Two ordered index scans, assembled in JS — no recursion (depth is capped at 2).
  const roots = await query(
    `${SELECT} WHERE c.post_id = ? AND c.root_comment_id IS NULL AND c.status = 'active'
     ORDER BY c.id DESC LIMIT 200`,
    [viewer?.id ?? 0, postId]
  );
  let replies = [];
  if (roots.length) {
    replies = await query(
      `${SELECT} WHERE c.post_id = ? AND c.root_comment_id IN (${roots.map(() => "?").join(",")})
       AND c.status = 'active' ORDER BY c.id ASC`,
      [viewer?.id ?? 0, postId, ...roots.map((r) => r.id)]
    );
  }

  const tree = roots.map((r) => ({ ...commentDTO(r), replies: [] }));
  const byId = new Map(tree.map((t) => [t.id, t]));
  for (const rep of replies) byId.get(rep.root_comment_id)?.replies.push(commentDTO(rep));

  const total = tree.reduce((n, t) => n + 1 + t.replies.length, 0);
  return Response.json({ comments: tree, total });
}

export async function POST(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const user = gate.user;
  const banned = postingBlockedResponse(user);
  if (banned) return banned;
  const { id: rawId } = await params;
  const postId = vId(rawId);
  if (!postId) return Response.json({ error: "Not found" }, { status: 404 });

  if (!(await rateLimit(`comment:${user.id}`, 30, 60 * 60))) {
    return Response.json({ error: "You're commenting too fast — take a breath." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const text = vString(body.body, { min: 1, max: 5000 });
  if (!text) return Response.json({ error: "Comment can't be empty" }, { status: 400 });
  if (containsProfanity(text)) return profanityResponse("comment");

  const commentId = await withTransaction(async (conn) => {
    const [[post]] = await conn.execute(
      "SELECT id, user_id, title FROM posts WHERE id = ? AND status = 'active' FOR UPDATE",
      [postId]
    );
    if (!post) return null;

    const [res] = await conn.execute(
      "INSERT INTO comments (post_id, user_id, body, score) VALUES (?, ?, ?, 1)",
      [postId, user.id, text]
    );
    await conn.execute(
      "INSERT INTO comment_votes (comment_id, user_id, value) VALUES (?, ?, 1)",
      [res.insertId, user.id]
    );
    await conn.execute("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?", [postId]);

    await createNotification(conn, {
      userId: post.user_id,
      actorUserId: user.id,
      type: "post_comment",
      postId,
      commentId: res.insertId,
      snippet: text,
    });
    await notifyMentions(conn, {
      usernames: parseMentions(text),
      actor: user,
      postId,
      commentId: res.insertId,
      snippet: text,
      skipUserIds: [post.user_id],
    });
    return res.insertId;
  });

  if (!commentId) return Response.json({ error: "Not found" }, { status: 404 });
  const [row] = await query(`${SELECT} WHERE c.id = ?`, [user.id, commentId]);
  return Response.json({ comment: { ...commentDTO(row), replies: [] } }, { status: 201 });
}
