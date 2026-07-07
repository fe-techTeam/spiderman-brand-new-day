// Notification producers. Always called inside the transaction that creates the
// triggering row, on a mysql2 connection. Self-notifications are suppressed here
// so callers don't have to remember. Votes NEVER notify (product rule).

export async function createNotification(
  conn,
  { userId, actorUserId = null, type, postId = null, commentId = null, entityType = null, entityId = null, snippet = "" }
) {
  if (actorUserId && Number(userId) === Number(actorUserId)) return; // never self-notify
  await conn.execute(
    `INSERT INTO notifications (user_id, actor_user_id, type, post_id, comment_id, entity_type, entity_id, snippet)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, actorUserId, type, postId, commentId, entityType, entityId, snippet.slice(0, 180)]
  );
}

/** Resolve @mentions to users and notify them (skipping actor + already-notified). */
export async function notifyMentions(conn, { usernames, actor, postId, commentId, snippet, skipUserIds = [] }) {
  if (!usernames.length) return;
  const [rows] = await conn.execute(
    `SELECT id, username FROM users
     WHERE username IN (${usernames.map(() => "?").join(",")}) AND status = 'active'`,
    usernames
  );
  const skip = new Set(skipUserIds.map(Number));
  for (const u of rows) {
    if (skip.has(Number(u.id))) continue;
    await createNotification(conn, {
      userId: u.id,
      actorUserId: actor.id,
      type: "mention",
      postId,
      commentId,
      snippet,
    });
  }
}
