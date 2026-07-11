import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-auth";

export async function GET() {
  const gate = await requireAdmin("dashboard.view");
  if (gate.error) return gate.error;

  const [counts] = await query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM users WHERE status = 'disabled') AS disabledUsers,
      (SELECT COUNT(*) FROM posts WHERE status = 'active') AS activePosts,
      (SELECT COUNT(*) FROM comments WHERE status = 'active') AS activeComments,
      (SELECT COUNT(*) FROM mj_messages WHERE status = 'pending') AS pendingMj,
      (SELECT COUNT(*) FROM fan_art WHERE status = 'pending') AS pendingFanArt,
      (SELECT COUNT(*) FROM reports WHERE status = 'open') AS openReports,
      (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL 7 DAY) AS newUsers7d,
      (SELECT COUNT(*) FROM shares) AS totalShares,
      (SELECT COUNT(*) FROM shares WHERE created_at > NOW() - INTERVAL 7 DAY) AS newShares7d
  `);

  const latestUsers = await query(`
    SELECT u.id, u.username, u.email, u.status, u.created_at, a.name AS avatar_name, a.emoji AS avatar_emoji
    FROM users u LEFT JOIN avatars a ON a.id = u.avatar_id
    ORDER BY u.id DESC LIMIT 6
  `);

  const identitySpread = await query(`
    SELECT a.name, a.emoji, COUNT(u.id) AS users
    FROM avatars a LEFT JOIN users u ON u.avatar_id = a.id
    WHERE a.is_active = 1
    GROUP BY a.id ORDER BY users DESC, a.sort_order
  `);

  return Response.json({ counts, latestUsers, identitySpread });
}
