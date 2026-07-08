import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { commentDTO, parseMentions } from "@/lib/server/forum";
import { createNotification, notifyMentions } from "@/lib/server/notify";
import { vId, vString } from "@/lib/server/validate";
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

export async function POST(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const user = gate.user;
  const banned = postingBlockedResponse(user);
  if (banned) return banned;
  const { id: rawId } = await params;
  const targetId = vId(rawId);
  if (!targetId) return Response.json({ error: "Not found" }, { status: 404 });

  if (!(await rateLimit(`comment:${user.id}`, 30, 60 * 60))) {
    return Response.json({ error: "You're replying too fast — take a breath." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const text = vString(body.body, { min: 1, max: 5000 });
  if (!text) return Response.json({ error: "Reply can't be empty" }, { status: 400 });

  const replyId = await withTransaction(async (conn) => {
    const [[target]] = await conn.execute(
      `SELECT c.id, c.post_id, c.user_id, c.root_comment_id FROM comments c
       JOIN posts p ON p.id = c.post_id AND p.status = 'active'
       WHERE c.id = ? AND c.status = 'active' FOR UPDATE`,
      [targetId]
    );
    if (!target) return null;

    // Depth is capped at 2: replying to a reply attaches to the same root —
    // exactly what the UI does (ReplyBox always targets the root).
    const rootId = target.root_comment_id ?? target.id;

    const [res] = await conn.execute(
      `INSERT INTO comments (post_id, user_id, parent_comment_id, root_comment_id, reply_to_user_id, body, score)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [target.post_id, user.id, target.id, rootId, target.user_id, text]
    );
    await conn.execute(
      "INSERT INTO comment_votes (comment_id, user_id, value) VALUES (?, ?, 1)",
      [res.insertId, user.id]
    );
    await conn.execute("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?", [target.post_id]);

    // Notify the comment being answered; also the root author when different.
    await createNotification(conn, {
      userId: target.user_id,
      actorUserId: user.id,
      type: "reply",
      postId: target.post_id,
      commentId: res.insertId,
      snippet: text,
    });
    const notified = [target.user_id];
    if (rootId !== target.id) {
      const [[root]] = await conn.execute("SELECT user_id FROM comments WHERE id = ?", [rootId]);
      if (root && !notified.includes(root.user_id)) {
        await createNotification(conn, {
          userId: root.user_id,
          actorUserId: user.id,
          type: "reply",
          postId: target.post_id,
          commentId: res.insertId,
          snippet: text,
        });
        notified.push(root.user_id);
      }
    }
    await notifyMentions(conn, {
      usernames: parseMentions(text),
      actor: user,
      postId: target.post_id,
      commentId: res.insertId,
      snippet: text,
      skipUserIds: notified,
    });
    return res.insertId;
  });

  if (!replyId) return Response.json({ error: "Not found" }, { status: 404 });
  const [row] = await query(`${SELECT} WHERE c.id = ?`, [user.id, replyId]);
  return Response.json(
    { reply: commentDTO(row), rootCommentId: row.root_comment_id },
    { status: 201 }
  );
}
