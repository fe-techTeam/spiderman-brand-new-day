import { query, withTransaction } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEnum, vId, vString } from "@/lib/server/validate";

const ACTIONS = {
  approve: { status: "approved", notif: "livefeed_approved" },
  reject: { status: "rejected", notif: "livefeed_rejected" },
  hide: { status: "hidden", notif: null },
  unhide: { status: "approved", notif: null },
};

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("livefeed.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = vEnum(body.action, Object.keys(ACTIONS));
  if (!action) return Response.json({ error: "Bad action" }, { status: 400 });
  const reason = body.reason ? vString(body.reason, { max: 255 }) : null;

  const [item] = await query(
    `SELECT lf.id, lf.user_id, lf.status, m.kind
     FROM live_feed lf JOIN media m ON m.id = lf.media_id WHERE lf.id = ?`,
    [id]
  );
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  const { status, notif } = ACTIONS[action];
  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE live_feed
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(3), rejection_reason = ?
       WHERE id = ?`,
      [status, gate.admin.id, action === "reject" ? reason : null, id]
    );
    // Admin-authored rows have no member to notify (user_id is NULL).
    if (notif && item.user_id) {
      await conn.execute(
        `INSERT INTO notifications (user_id, type, entity_type, entity_id, snippet)
         VALUES (?, ?, 'live_feed', ?, ?)`,
        [item.user_id, notif, id, item.kind === "video" ? "your video" : "your photo"]
      );
    }
  });

  await auditLog(gate.admin.id, `livefeed.${action}`, "live_feed", id, {
    from: item.status,
    to: status,
    reason,
  });
  return Response.json({ ok: true, status });
}
