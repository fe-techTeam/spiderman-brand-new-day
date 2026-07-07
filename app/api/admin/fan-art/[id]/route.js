import { query, withTransaction } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEnum, vId, vString } from "@/lib/server/validate";

const ACTIONS = {
  approve: { status: "approved", notif: "fanart_approved" },
  reject: { status: "rejected", notif: "fanart_rejected" },
  hide: { status: "hidden", notif: null },
  unhide: { status: "approved", notif: null },
};

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("fanart.review");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = vEnum(body.action, Object.keys(ACTIONS));
  if (!action) return Response.json({ error: "Bad action" }, { status: 400 });
  const reason = body.reason ? vString(body.reason, { max: 255 }) : null;

  const [art] = await query("SELECT id, user_id, status, title FROM fan_art WHERE id = ?", [id]);
  if (!art) return Response.json({ error: "Not found" }, { status: 404 });

  const { status, notif } = ACTIONS[action];
  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE fan_art
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(3), rejection_reason = ?
       WHERE id = ?`,
      [status, gate.admin.id, action === "reject" ? reason : null, id]
    );
    if (notif) {
      await conn.execute(
        `INSERT INTO notifications (user_id, type, entity_type, entity_id, snippet)
         VALUES (?, ?, 'fan_art', ?, ?)`,
        [art.user_id, notif, id, art.title.slice(0, 160)]
      );
    }
  });

  await auditLog(gate.admin.id, `fanart.${action}`, "fan_art", id, {
    from: art.status,
    to: status,
    reason,
  });
  return Response.json({ ok: true, status });
}
