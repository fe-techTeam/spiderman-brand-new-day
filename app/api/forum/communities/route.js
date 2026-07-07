import { query } from "@/lib/server/db";

export async function GET() {
  const rows = await query(
    `SELECT c.id, c.slug, c.handle, c.color,
            (SELECT COUNT(*) FROM posts p WHERE p.community_id = c.id AND p.status = 'active') AS post_count
     FROM communities c WHERE c.is_active = 1 ORDER BY c.id`
  );
  return Response.json({ communities: rows });
}
