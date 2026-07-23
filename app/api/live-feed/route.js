import crypto from "node:crypto";
import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { decodeCursor, encodeCursor } from "@/lib/server/forum";
import { saveUpload } from "@/lib/server/uploads";
import { getSetting } from "@/lib/server/settings";
import { postingBlockedResponse } from "@/lib/server/moderation";
import { rateLimit } from "@/lib/server/rate-limit";
import { buildAuthor } from "@/lib/server/live-feed";

const UPLOADS_SETTING = "live_feed_user_uploads";
const SHARE_SETTING = "live_feed_share";
const MAX_PENDING_PER_USER = 5;

// Members-only feed — approved items in a per-viewer random order.
//
// Each browse cycle gets a seed; rows are ordered by SHA2(seed:id), which is
// a stable shuffle for that seed, so keyset pagination on the hash never
// skips or repeats within a cycle. (ORDER BY RAND(seed) is NOT page-stable —
// it depends on row evaluation order. MD5() would also do, but it's gone in
// MySQL 9; SHA2 exists on 8.x and 9.x.) The seed rides inside the opaque
// cursor; a request without a cursor mints a fresh seed = a fresh order.
export async function GET(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(30, Math.max(1, Number(sp.get("limit")) || 12));
  const cursor = decodeCursor(sp.get("cursor"));
  const seed = Number.isInteger(cursor?.s) && cursor.s >= 0 ? cursor.s : crypto.randomInt(2 ** 31);

  // Placeholders bind in order of appearance: SELECT's seed first, then the
  // cursor predicate's (the alias can't be referenced in WHERE, so the
  // expression repeats).
  const args = [String(seed)];
  let where = "WHERE lf.status = 'approved'";
  if (typeof cursor?.h === "string" && /^[0-9a-f]{64}$/.test(cursor.h)) {
    where += " AND SHA2(CONCAT(?, ':', lf.id), 256) > ?";
    args.push(String(seed), cursor.h);
  }
  const rows = await query(
    `SELECT lf.id, lf.media_id, lf.created_at, lf.author_name, m.kind, m.width, m.height, u.username,
            SHA2(CONCAT(?, ':', lf.id), 256) AS shuffle_key
     FROM live_feed lf
     JOIN media m ON m.id = lf.media_id
     LEFT JOIN users u ON u.id = lf.user_id
     ${where}
     ORDER BY shuffle_key, lf.id
     LIMIT ${limit + 1}`,
    args
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  return Response.json({
    items: page.map((r) => ({
      id: r.id,
      kind: r.kind,
      url: `/api/media/${r.media_id}`,
      width: r.width,
      height: r.height,
      createdAt: r.created_at,
      // Attribution wins if an admin set one (a name/handle for whoever the
      // drop came from); otherwise a member handle (u/…), otherwise the house
      // account. `isMember` only drives the "u/" prefix on the client.
      author: buildAuthor(r),
    })),
    nextCursor: hasMore ? encodeCursor({ s: seed, h: page[page.length - 1].shuffle_key }) : null,
    uploadsEnabled: (await getSetting(UPLOADS_SETTING)) === "1",
    shareEnabled: (await getSetting(SHARE_SETTING)) === "1",
  });
}

// Member upload (only while the admin toggle is ON) → media row + pending
// live_feed row. No title/caption — the feed is media-only by design.
export async function POST(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const user = gate.user;

  if ((await getSetting(UPLOADS_SETTING)) !== "1") {
    return Response.json(
      { error: "Member uploads are closed right now — check back soon.", code: "uploads_disabled" },
      { status: 403 }
    );
  }
  const banned = postingBlockedResponse(user);
  if (banned) return banned;

  // At most 5 drops in the review queue per member — checked before the rate
  // limit so a capped upload neither burns a token nor buffers the file. The
  // way out is on the client: remove a pending drop (DELETE /live-feed/[id]).
  const [{ pendingCount }] = await query(
    "SELECT COUNT(*) AS pendingCount FROM live_feed WHERE user_id = ? AND status = 'pending'",
    [user.id]
  );
  if (pendingCount >= MAX_PENDING_PER_USER) {
    return Response.json(
      {
        error: `You already have ${MAX_PENDING_PER_USER} drops waiting for review — remove one to make room, or hang tight for the verdict.`,
        code: "pending_limit",
      },
      { status: 409 }
    );
  }

  if (!(await rateLimit(`livefeed:${user.id}`, 5, 60 * 60))) {
    return Response.json({ error: "Upload limit reached — try again later." }, { status: 429 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveUpload(form.get("file"), "live-feed", { allowVideo: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const feedId = await withTransaction(async (conn) => {
    const [media] = await conn.execute(
      `INSERT INTO media (user_id, kind, storage, file_path, mime_type, size_bytes, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, saved.kind, saved.storage, saved.key, saved.mime, saved.size, saved.width, saved.height]
    );
    const [row] = await conn.execute(
      "INSERT INTO live_feed (user_id, media_id) VALUES (?, ?)",
      [user.id, media.insertId]
    );
    return row.insertId;
  });

  return Response.json(
    { id: feedId, status: "pending", message: "Uploaded! It hits the feed once approved." },
    { status: 201 }
  );
}
