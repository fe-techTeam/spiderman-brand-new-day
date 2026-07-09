import { query, withTransaction } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEnum, vId, vString } from "@/lib/server/validate";
import { consequenceForStrikes, takedownMessage } from "@/lib/server/moderation";
import { recountPostComments } from "@/lib/server/forum";

const CONTENT_TABLE = { post: "posts", comment: "comments" };

// Resolve a report.
//   dismiss  → the content is fine; close every open report on that item.
//   takedown → hide the content, close every open report on it as 'actioned',
//              and apply the escalating strike consequence to the author (a
//              notification tells them what happened + their ban).
export async function PATCH(request, { params }) {
  const gate = await requireAdmin("forum.moderate");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = vEnum(body.action, ["dismiss", "takedown"]);
  if (!action) return Response.json({ error: "Bad action" }, { status: 400 });
  const reason = body.reason ? vString(body.reason, { max: 255 }) : null;

  const [report] = await query(
    "SELECT id, entity_type, entity_id, status FROM reports WHERE id = ?",
    [id]
  );
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  if (report.status !== "open") {
    return Response.json({ error: "This report was already resolved" }, { status: 409 });
  }

  const table = CONTENT_TABLE[report.entity_type];

  // ── Dismiss ────────────────────────────────────────────────────────────
  if (action === "dismiss") {
    await query(
      `UPDATE reports SET status = 'dismissed', resolved_by = ?, resolved_at = NOW(3)
       WHERE entity_type = ? AND entity_id = ? AND status = 'open'`,
      [gate.admin.id, report.entity_type, report.entity_id]
    );
    await auditLog(gate.admin.id, "report.dismiss", "report", id, {
      entity_type: report.entity_type,
      entity_id: report.entity_id,
    });
    return Response.json({ ok: true, status: "dismissed" });
  }

  // ── Take down ──────────────────────────────────────────────────────────
  const outcome = await withTransaction(async (conn) => {
    const [[content]] = await conn.execute(
      `SELECT id, user_id, status FROM ${table} WHERE id = ? FOR UPDATE`,
      [report.entity_id]
    );

    // Close every open report on this item regardless of what we do next.
    await conn.execute(
      `UPDATE reports SET status = 'actioned', resolved_by = ?, resolved_at = NOW(3)
       WHERE entity_type = ? AND entity_id = ? AND status = 'open'`,
      [gate.admin.id, report.entity_type, report.entity_id]
    );

    if (!content) return { strike: null, note: "gone" };

    // A strike is counted only when we actually remove still-visible content —
    // re-actioning already-hidden/author-deleted content must not double-punish.
    if (content.status !== "active") {
      return { strike: null, note: "already_removed" };
    }

    if (report.entity_type === "comment") {
      // Hide the comment AND cascade to its still-active replies (the thread has
      // no tombstone for a hidden root's replies, so they'd vanish either way) …
      const [[c]] = await conn.execute("SELECT post_id FROM comments WHERE id = ?", [report.entity_id]);
      await conn.execute(
        `UPDATE comments
         SET status = 'hidden', moderated_by = ?, moderated_at = NOW(3), moderation_reason = ?
         WHERE (id = ? OR root_comment_id = ?) AND status = 'active'`,
        [gate.admin.id, reason, report.entity_id, report.entity_id]
      );
      // … then re-sync the post's comment_count so the forum card badge doesn't
      // keep counting the removed comment(s).
      if (c) await recountPostComments(conn, c.post_id);
    } else {
      await conn.execute(
        `UPDATE posts
         SET status = 'hidden', moderated_by = ?, moderated_at = NOW(3), moderation_reason = ?
         WHERE id = ?`,
        [gate.admin.id, reason, report.entity_id]
      );
    }

    // Lock the offender row, bump the cumulative strike count, apply consequence.
    const [[author]] = await conn.execute(
      "SELECT id, takedown_count FROM users WHERE id = ? FOR UPDATE",
      [content.user_id]
    );
    const strike = (author?.takedown_count || 0) + 1;
    const consequence = consequenceForStrikes(strike);

    if (consequence.type === "platform_ban") {
      // Full suspension: disable the account and kill live sessions.
      await conn.execute(
        `UPDATE users SET takedown_count = ?, status = 'disabled',
                token_version = token_version + 1
         WHERE id = ?`,
        [strike, content.user_id]
      );
    } else {
      await conn.execute(
        `UPDATE users SET takedown_count = ?,
                forum_ban_until = DATE_ADD(NOW(3), INTERVAL ? HOUR)
         WHERE id = ?`,
        [strike, consequence.hours, content.user_id]
      );
    }

    // Tell the author their content was removed + the consequence.
    const noun = report.entity_type === "post" ? "post" : "comment";
    await conn.execute(
      `INSERT INTO notifications (user_id, type, entity_type, entity_id, snippet)
       VALUES (?, 'post_removed', ?, ?, ?)`,
      [content.user_id, report.entity_type, report.entity_id, takedownMessage(noun, consequence).slice(0, 180)]
    );

    return { strike, consequence: consequence.type, authorId: content.user_id };
  });

  await auditLog(gate.admin.id, "report.takedown", "report", id, {
    entity_type: report.entity_type,
    entity_id: report.entity_id,
    strike: outcome.strike,
    consequence: outcome.consequence || outcome.note || null,
    reason,
  });

  return Response.json({ ok: true, status: "actioned", strike: outcome.strike });
}
