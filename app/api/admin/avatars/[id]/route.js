import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vId, vString } from "@/lib/server/validate";

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("avatars.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const [avatar] = await query("SELECT * FROM avatars WHERE id = ?", [id]);
  if (!avatar) return Response.json({ error: "Not found" }, { status: 404 });

  const sets = [];
  const args = [];
  const push = (col, val) => {
    sets.push(`${col} = ?`);
    args.push(val);
  };

  if (body.name !== undefined) {
    const v = vString(body.name, { max: 60 });
    if (!v) return Response.json({ error: "Bad name" }, { status: 400 });
    push("name", v);
  }
  if (body.emoji !== undefined) push("emoji", vString(body.emoji, { max: 16 }) || "");
  if (body.tagline !== undefined) push("tagline", vString(body.tagline, { max: 200 }) || "");
  if (body.description !== undefined)
    push("description", typeof body.description === "string" ? body.description.slice(0, 2000) : null);
  if (body.color !== undefined) {
    if (body.color !== null && !/^#[0-9a-fA-F]{6}$/.test(body.color))
      return Response.json({ error: "Bad color" }, { status: 400 });
    push("color", body.color);
  }
  // collectible card artwork shown on the identity reveal (path or URL)
  if (body.cardImage !== undefined) push("badge_asset", vString(body.cardImage, { max: 255 }) || null);
  // member profile picture shown on forum posts/comments and the MJ Wall
  if (body.profileImage !== undefined) push("profile_asset", vString(body.profileImage, { max: 255 }) || null);
  if (body.sortOrder !== undefined && Number.isInteger(body.sortOrder)) push("sort_order", body.sortOrder);
  if (body.isActive !== undefined) {
    if (!body.isActive) {
      // An avatar still referenced by the active mapping cannot be deactivated —
      // the quiz would award points to a dead identity.
      const [{ n }] = await query(
        `SELECT COUNT(*) AS n FROM quiz_options
         WHERE is_active = 1 AND (primary_avatar_id = ? OR secondary_avatar_id = ?)`,
        [id, id]
      );
      if (n > 0) {
        return Response.json(
          { error: `Avatar is used by ${n} active quiz option(s). Remap those first.` },
          { status: 409 }
        );
      }
    }
    push("is_active", body.isActive ? 1 : 0);
  }
  if (!sets.length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  args.push(id);
  await query(`UPDATE avatars SET ${sets.join(", ")} WHERE id = ?`, args);
  await auditLog(gate.admin.id, "avatar.update", "avatar", id, { patch: body });
  return Response.json({ ok: true });
}
