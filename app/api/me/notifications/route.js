import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { decodeCursor, encodeCursor } from "@/lib/server/forum";

const KIND = {
  reply: "reply",
  post_comment: "post-comment",
  mention: "mention",
  mj_approved: "mj-approved",
  mj_rejected: "mj-rejected",
  fanart_approved: "fanart-approved",
  fanart_rejected: "fanart-rejected",
  post_removed: "post-removed",
  system: "system",
};

function href(n) {
  if (n.post_id) return `/forum/${n.post_id}`;
  if (n.entity_type === "mj_message") return "/mj-wall";
  if (n.entity_type === "fan_art") return "/fan-art";
  return "/forum";
}

export async function GET(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const cursor = decodeCursor(sp.get("cursor"));

  const args = [gate.user.id];
  let where = "WHERE n.user_id = ?";
  if (cursor?.id) {
    where += " AND n.id < ?";
    args.push(Number(cursor.id));
  }
  const rows = await query(
    `SELECT n.id, n.type, n.post_id, n.comment_id, n.entity_type, n.entity_id,
            n.snippet, n.read_at, n.created_at, a.username AS actor_username
     FROM notifications n LEFT JOIN users a ON a.id = n.actor_user_id
     ${where} ORDER BY n.id DESC LIMIT ${limit + 1}`,
    args
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const [{ unread }] = await query(
    "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [gate.user.id]
  );

  return Response.json({
    notifications: page.map((n) => ({
      id: n.id,
      kind: KIND[n.type] || "system",
      who: n.actor_username ? `u/${n.actor_username}` : "The Web",
      snippet: n.snippet,
      href: href(n),
      time: n.created_at,
      read: n.read_at !== null,
    })),
    unreadCount: unread,
    nextCursor: hasMore ? encodeCursor({ id: page[page.length - 1].id }) : null,
  });
}
