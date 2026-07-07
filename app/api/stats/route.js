import { query } from "@/lib/server/db";

// Living Web numbers for the home page (replaces the hardcoded
// "12,480 Dreamers across 34 countries").
export async function GET() {
  const [totals] = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS members,
      (SELECT COUNT(DISTINCT country) FROM users WHERE status = 'active' AND country IS NOT NULL) AS countries
  `);
  const identities = await query(`
    SELECT a.slug, a.name, a.emoji, a.color, COUNT(u.id) AS members
    FROM avatars a
    LEFT JOIN users u ON u.avatar_id = a.id AND u.status = 'active'
    WHERE a.is_active = 1
    GROUP BY a.id ORDER BY a.sort_order
  `);
  return Response.json({
    members: totals.members,
    countries: totals.countries,
    identities,
  });
}
