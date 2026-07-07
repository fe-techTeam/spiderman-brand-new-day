// DB-backed fixed-window rate limiter. Returns true when allowed.
// bucket example: "admin-login:1.2.3.4". See BACKEND.md §3.1.

import { query } from "@/lib/server/db";

export async function rateLimit(bucket, max, windowSeconds) {
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000
  );
  await query(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [bucket, windowStart]
  );
  const rows = await query(
    "SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?",
    [bucket, windowStart]
  );
  // Opportunistic cleanup of stale windows (cheap, occasional).
  if (Math.random() < 0.02) {
    query("DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL 1 DAY").catch(() => {});
  }
  return (rows[0]?.count ?? 1) <= max;
}
