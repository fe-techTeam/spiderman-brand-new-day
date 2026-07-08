import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { decodeCursor, encodeCursor } from "@/lib/server/forum";
import { vString } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";
import { postingBlockedResponse } from "@/lib/server/moderation";

// Public gallery — approved messages only, newest first, keyset paginated.
export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(30, Math.max(1, Number(sp.get("limit")) || 12));
  const cursor = decodeCursor(sp.get("cursor"));
  const featuredOnly = sp.get("featured") === "1";

  const args = [];
  let where = "WHERE m.status = 'approved'";
  if (featuredOnly) where += " AND m.is_featured = 1";
  if (cursor?.id) {
    where += " AND m.id < ?";
    args.push(Number(cursor.id));
  }
  const rows = await query(
    `SELECT m.id, m.body, m.created_at, u.username, av.profile_asset AS avatar_pic
     FROM mj_messages m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN avatars av ON av.id = u.avatar_id
     ${where} ORDER BY m.id DESC LIMIT ${limit + 1}`,
    args
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  return Response.json({
    messages: page.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.created_at,
      author: { username: m.username, avatarPic: m.avatar_pic || null },
    })),
    nextCursor: hasMore ? encodeCursor({ id: page[page.length - 1].id }) : null,
  });
}

export async function POST(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const banned = postingBlockedResponse(gate.user);
  if (banned) return banned;
  if (!(await rateLimit(`mj:${gate.user.id}`, 5, 60 * 60))) {
    return Response.json({ error: "You've sent a lot of messages — try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const text = vString(body.body, { min: 2, max: 280 });
  if (!text) return Response.json({ error: "Message must be 2–280 characters" }, { status: 400 });

  const result = await query("INSERT INTO mj_messages (user_id, body) VALUES (?, ?)", [gate.user.id, text]);
  return Response.json(
    { id: result.insertId, status: "pending", message: "Sent! Your memory appears on the wall once approved." },
    { status: 201 }
  );
}
