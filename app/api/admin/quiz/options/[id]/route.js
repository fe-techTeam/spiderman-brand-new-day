import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vId, vString } from "@/lib/server/validate";

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("quiz.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const [opt] = await query(
    `SELECT id, text, primary_avatar_id, secondary_avatar_id, primary_points, secondary_points
     FROM quiz_options WHERE id = ?`,
    [id]
  );
  if (!opt) return Response.json({ error: "Not found" }, { status: 404 });

  const sets = [];
  const args = [];
  if (body.text !== undefined) {
    const text = vString(body.text, { max: 255 });
    if (!text) return Response.json({ error: "Bad text" }, { status: 400 });
    sets.push("text = ?");
    args.push(text);
  }
  if (body.primaryAvatarId !== undefined) {
    const v = vId(body.primaryAvatarId);
    if (!v) return Response.json({ error: "Bad primaryAvatarId" }, { status: 400 });
    sets.push("primary_avatar_id = ?");
    args.push(v);
  }
  if (body.secondaryAvatarId !== undefined) {
    const v = vId(body.secondaryAvatarId);
    if (!v) return Response.json({ error: "Bad secondaryAvatarId" }, { status: 400 });
    sets.push("secondary_avatar_id = ?");
    args.push(v);
  }
  if (body.primaryPoints !== undefined) {
    if (!Number.isInteger(body.primaryPoints) || body.primaryPoints < 0 || body.primaryPoints > 10)
      return Response.json({ error: "Bad primaryPoints" }, { status: 400 });
    sets.push("primary_points = ?");
    args.push(body.primaryPoints);
  }
  if (body.secondaryPoints !== undefined) {
    if (!Number.isInteger(body.secondaryPoints) || body.secondaryPoints < 0 || body.secondaryPoints > 10)
      return Response.json({ error: "Bad secondaryPoints" }, { status: 400 });
    sets.push("secondary_points = ?");
    args.push(body.secondaryPoints);
  }
  if (body.position !== undefined && Number.isInteger(body.position)) {
    sets.push("position = ?");
    args.push(body.position);
  }
  if (body.isActive !== undefined) {
    sets.push("is_active = ?");
    args.push(body.isActive ? 1 : 0);
  }
  if (!sets.length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  args.push(id);
  await query(`UPDATE quiz_options SET ${sets.join(", ")} WHERE id = ?`, args);
  await auditLog(gate.admin.id, "quiz.option.update", "quiz_option", id, {
    before: opt,
    patch: body,
  });
  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const gate = await requireAdmin("quiz.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  await query("UPDATE quiz_options SET is_active = 0 WHERE id = ?", [id]);
  await auditLog(gate.admin.id, "quiz.option.deactivate", "quiz_option", id, null);
  return Response.json({ ok: true });
}
