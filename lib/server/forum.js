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

export function postDTO(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    isSpoiler: row.is_spoiler === 1,
    score: row.score,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    author: { username: row.username },
    community: row.community_handle
      ? { handle: row.community_handle, color: row.community_color }
      : null,
    flair: row.flair_label || null,
    myVote: row.my_vote === 1 ? "up" : row.my_vote === -1 ? "down" : null,
  };
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
