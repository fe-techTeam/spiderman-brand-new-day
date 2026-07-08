// Shared report-submission logic for the two portal endpoints (posts/comments).
// Verifies the target exists and is visible, blocks self-reports, and enforces
// one report per user per item via the reports unique key. See migration 009.

import { query } from "@/lib/server/db";

const TABLE = { post: "posts", comment: "comments" };

/**
 * @returns {{ ok: true } | { error: string, status: number, code?: string }}
 */
export async function submitReport({ reporterId, entityType, entityId, reason }) {
  const table = TABLE[entityType];
  if (!table) return { error: "Unknown target", status: 400 };

  const [content] = await query(
    `SELECT id, user_id, status FROM ${table} WHERE id = ?`,
    [entityId]
  );
  // Only active content is reportable — already-hidden/deleted items are moot.
  if (!content || content.status !== "active") {
    return { error: "That content is no longer available", status: 404 };
  }
  if (Number(content.user_id) === Number(reporterId)) {
    return { error: "You can't report your own content", status: 400, code: "own_content" };
  }

  try {
    await query(
      `INSERT INTO reports (reporter_user_id, entity_type, entity_id, reason)
       VALUES (?, ?, ?, ?)`,
      [reporterId, entityType, entityId, reason]
    );
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return { error: "You've already reported this — our moderators are on it.", status: 409, code: "already_reported" };
    }
    throw err;
  }
  return { ok: true };
}
