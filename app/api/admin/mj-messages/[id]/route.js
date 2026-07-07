import { query, withTransaction } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEnum, vId, vString } from "@/lib/server/validate";

const ACTIONS = {
  approve: { status: "approved", notif: "mj_approved" },
  reject: { status: "rejected", notif: "mj_rejected" },
  hide: { status: "hidden", notif: null },
  unhide: { status: "approved", notif: null },
};

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("mj.review");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = vEnum(body.action, [...Object.keys(ACTIONS), "feature", "unfeature"]);
  if (!action) return Response.json({ error: "Bad action" }, { status: 400 });
  const reason = body.reason ? vString(body.reason, { max: 255 }) : null;

  const [msg] = await query("SELECT id, user_id, status, body FROM mj_messages WHERE id = ?", [id]);
  if (!msg) return Response.json({ error: "Not found" }, { status: 404 });

  if (action === "feature" || action === "unfeature") {
    await query("UPDATE mj_messages SET is_featured = ? WHERE id = ?", [action === "feature" ? 1 : 0, id]);
    await auditLog(gate.admin.id, `mj.${action}`, "mj_message", id, null);
    return Response.json({ ok: true });
  }

  const { status, notif } = ACTIONS[action];
  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE mj_messages
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(3), rejection_reason = ?
       WHERE id = ?`,
      [status, gate.admin.id, action === "reject" ? reason : null, id]
    );
    if (notif) {
      await conn.execute(
        `INSERT INTO notifications (user_id, type, entity_type, entity_id, snippet)
         VALUES (?, ?, 'mj_message', ?, ?)`,
        [msg.user_id, notif, id, msg.body.slice(0, 160)]
      );
    }
  });

  await auditLog(gate.admin.id, `mj.${action}`, "mj_message", id, {
    from: msg.status,
    to: status,
    reason,
  });
  return Response.json({ ok: true, status });
}
