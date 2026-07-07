import { query, withTransaction } from "@/lib/server/db";
import { verifyUserSession, requireUser } from "@/lib/server/auth";
import { decodeCursor, encodeCursor, hotScore, mediaForPosts, postDTO } from "@/lib/server/forum";
import { saveUpload } from "@/lib/server/uploads";
import { vEnum, vId, vString } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";

const MAX_POST_MEDIA = 4;

const SELECT = `
  SELECT p.id, p.title, p.body, p.is_spoiler, p.score, p.comment_count, p.hot_score, p.created_at, p.edited_at,
         u.username, c.handle AS community_handle, c.color AS community_color, f.label AS flair_label,
         pv.value AS my_vote
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN communities c ON c.id = p.community_id
  LEFT JOIN flairs f ON f.id = p.flair_id
  LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = ?`;

export async function GET(request) {
  const viewer = await verifyUserSession(); // optional — hydrates myVote
  const sp = request.nextUrl.searchParams;
  const sort = vEnum(sp.get("sort") || "new", ["new", "top", "hot"]);
  if (!sort) return Response.json({ error: "Bad sort" }, { status: 400 });
  const limit = Math.min(20, Math.max(1, Number(sp.get("limit")) || 6));
  const cursor = decodeCursor(sp.get("cursor"));

  // Keyset pagination — tuple comparison per sort key; limit+1 rows ⇒ hasMore.
  let where = "WHERE p.status = 'active'";
  let order;
  const args = [viewer?.id ?? 0];
  if (sort === "new") {
    order = "ORDER BY p.id DESC";
    if (cursor?.id) {
      where += " AND p.id < ?";
      args.push(Number(cursor.id));
    }
  } else if (sort === "top") {
    order = "ORDER BY p.score DESC, p.id DESC";
    if (cursor?.id != null && cursor?.s != null) {
      where += " AND (p.score < ? OR (p.score = ? AND p.id < ?))";
      args.push(Number(cursor.s), Number(cursor.s), Number(cursor.id));
    }
  } else {
    order = "ORDER BY p.hot_score DESC, p.id DESC";
    if (cursor?.id != null && cursor?.h != null) {
      where += " AND (p.hot_score < ? OR (p.hot_score = ? AND p.id < ?))";
      args.push(Number(cursor.h), Number(cursor.h), Number(cursor.id));
    }
  }

  const rows = await query(`${SELECT} ${where} ${order} LIMIT ${limit + 1}`, args);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor = hasMore
    ? encodeCursor(
        sort === "new"
          ? { id: last.id }
          : sort === "top"
            ? { s: last.score, id: last.id }
            : { h: last.hot_score, id: last.id }
      )
    : null;

  const mediaMap = await mediaForPosts(query, page.map((p) => p.id));
  return Response.json({
    posts: page.map((p) => postDTO(p, mediaMap.get(p.id))),
    nextCursor,
    hasMore,
  });
}

export async function POST(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const user = gate.user;
  if (!user.quiz_completed_at) {
    return Response.json(
      { error: "Discover your Spider identity before posting", code: "quiz_required" },
      { status: 403 }
    );
  }
  if (!(await rateLimit(`post:${user.id}`, 10, 60 * 60))) {
    return Response.json({ error: "You're posting too fast — take a breath." }, { status: 429 });
  }

  // JSON (text-only) or multipart (with photos/videos) — both supported.
  let title, text, isSpoiler, communityId, flairId;
  let files = [];
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    let form;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: "Bad form data" }, { status: 400 });
    }
    title = vString(form.get("title"), { min: 3, max: 300 });
    text = vString(form.get("body"), { min: 1, max: 10000 });
    isSpoiler = form.get("isSpoiler") === "true" || form.get("isSpoiler") === "1";
    communityId = form.get("communityId") ? vId(form.get("communityId")) : null;
    flairId = form.get("flairId") ? vId(form.get("flairId")) : null;
    files = form.getAll("media").filter((f) => f && typeof f.arrayBuffer === "function" && f.size > 0);
    if (files.length > MAX_POST_MEDIA) {
      return Response.json({ error: `At most ${MAX_POST_MEDIA} attachments per post` }, { status: 400 });
    }
  } else {
    const body = await request.json().catch(() => ({}));
    title = vString(body.title, { min: 3, max: 300 });
    text = vString(body.body, { min: 1, max: 10000 });
    isSpoiler = body.isSpoiler === true;
    communityId = body.communityId ? vId(body.communityId) : null;
    flairId = body.flairId ? vId(body.flairId) : null;
  }

  if (!title || !text) {
    return Response.json({ error: "Title (3+ chars) and body are required" }, { status: 400 });
  }
  if (communityId) {
    const [c] = await query("SELECT id FROM communities WHERE id = ? AND is_active = 1", [communityId]);
    if (!c) return Response.json({ error: "Unknown community" }, { status: 400 });
  }
  if (flairId) {
    const [f] = await query("SELECT id FROM flairs WHERE id = ? AND is_active = 1", [flairId]);
    if (!f) return Response.json({ error: "Unknown flair" }, { status: 400 });
  }

  // Validate + compress + store attachments BEFORE the DB transaction.
  const saved = [];
  for (const file of files) {
    try {
      saved.push(await saveUpload(file, "posts", { allowVideo: true }));
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  const postId = await withTransaction(async (conn) => {
    const now = new Date();
    // Author's implicit self-upvote is a real vote row so counters always reconcile.
    const [res] = await conn.execute(
      `INSERT INTO posts (user_id, community_id, flair_id, title, body, is_spoiler, score, hot_score)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [user.id, communityId, flairId, title, text, isSpoiler ? 1 : 0, hotScore(1, now)]
    );
    await conn.execute(
      "INSERT INTO post_votes (post_id, user_id, value) VALUES (?, ?, 1)",
      [res.insertId, user.id]
    );
    for (let i = 0; i < saved.length; i++) {
      const m = saved[i];
      const [mediaRes] = await conn.execute(
        `INSERT INTO media (user_id, kind, storage, file_path, mime_type, size_bytes, width, height)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, m.kind, m.storage, m.key, m.mime, m.size, m.width, m.height]
      );
      await conn.execute(
        "INSERT INTO post_media (post_id, media_id, position) VALUES (?, ?, ?)",
        [res.insertId, mediaRes.insertId, i]
      );
    }
    return res.insertId;
  });

  const [row] = await query(`${SELECT} WHERE p.id = ?`, [user.id, postId]);
  const mediaMap = await mediaForPosts(query, [postId]);
  return Response.json({ post: postDTO(row, mediaMap.get(postId)) }, { status: 201 });
}
