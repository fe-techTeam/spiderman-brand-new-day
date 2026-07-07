// Forum helpers: hot ranking, opaque keyset cursors, DTO mapping.
// See BACKEND.md §7 / §13.

/** Reddit-style hot score, stored on write so reads stay index-only. */
export function hotScore(score, createdAt) {
  const s = Math.sign(score) * Math.log10(Math.max(Math.abs(score), 1));
  return s + new Date(createdAt).getTime() / 1000 / 45000;
}

export function encodeCursor(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

export function decodeCursor(str) {
  if (!str) return null;
  try {
    const obj = JSON.parse(Buffer.from(str, "base64url").toString("utf8"));
    return typeof obj === "object" && obj !== null ? obj : null;
  } catch {
    return null;
  }
}

export function postDTO(row, media = []) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    isSpoiler: row.is_spoiler === 1,
    score: row.score,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? null, // time of the latest edit; null = never edited
    author: { username: row.username },
    community: row.community_handle
      ? { handle: row.community_handle, color: row.community_color }
      : null,
    flair: row.flair_label || null,
    myVote: row.my_vote === 1 ? "up" : row.my_vote === -1 ? "down" : null,
    media, // [{ id, kind, url }] — images/videos attached to the post
  };
}

/** Batch-fetch attached media for a page of posts → Map<postId, media[]>. */
export async function mediaForPosts(queryFn, postIds) {
  const map = new Map(postIds.map((id) => [id, []]));
  if (!postIds.length) return map;
  const rows = await queryFn(
    `SELECT pm.post_id, m.id, m.kind
     FROM post_media pm JOIN media m ON m.id = pm.media_id
     WHERE pm.post_id IN (${postIds.map(() => "?").join(",")})
     ORDER BY pm.post_id, pm.position, pm.id`,
    postIds
  );
  for (const r of rows) {
    map.get(r.post_id)?.push({ id: r.id, kind: r.kind, url: `/api/media/${r.id}` });
  }
  return map;
}

export function commentDTO(row) {
  return {
    id: row.id,
    body: row.body,
    score: row.score,
    createdAt: row.created_at,
    author: { username: row.username },
    replyTo: row.reply_to_username || null,
    myVote: row.my_vote === 1 ? "up" : row.my_vote === -1 ? "down" : null,
  };
}

/** @mention tokens → distinct lowercase usernames (capped to limit spam). */
export function parseMentions(body, cap = 3) {
  const out = new Set();
  for (const m of body.matchAll(/@([a-z0-9_]{3,30})/gi)) {
    out.add(m[1].toLowerCase());
    if (out.size >= cap) break;
  }
  return [...out];
}
