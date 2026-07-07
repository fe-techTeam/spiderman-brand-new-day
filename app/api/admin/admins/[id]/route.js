import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vId, vString } from "@/lib/server/validate";
import bcrypt from "bcryptjs";

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("admins.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const [target] = await query(
    `SELECT a.id, a.status, r.slug AS role_slug FROM admin_users a
     JOIN admin_roles r ON r.id = a.role_id WHERE a.id = ?`,
    [id]
  );
  if (!target) return Response.json({ error: "Not found" }, { status: 404 });

  // Self-lockout guards: you cannot disable yourself or demote yourself out of admins.manage.
  if (id === gate.admin.id && (body.action === "disable" || body.roleId !== undefined)) {
    return Response.json({ error: "You cannot disable or change your own role" }, { status: 409 });
  }

  if (body.action === "disable" || body.action === "enable") {
    // Never disable the last active super admin.
    if (body.action === "disable" && target.role_slug === "super_admin") {
      const [{ n }] = await query(
        `SELECT COUNT(*) AS n FROM admin_users a JOIN admin_roles r ON r.id = a.role_id
         WHERE r.slug = 'super_admin' AND a.status = 'active' AND a.id != ?`,
        [id]
      );
      if (n === 0) {
        return Response.json({ error: "Cannot disable the last active super admin" }, { status: 409 });
      }
    }
    const status = body.action === "disable" ? "disabled" : "active";
    await query(
      "UPDATE admin_users SET status = ?, token_version = token_version + 1 WHERE id = ?",
      [status, id]
    );
    await auditLog(gate.admin.id, `admin.${body.action}`, "admin_user", id, { from: target.status });
    return Response.json({ ok: true, status });
  }

  const sets = [];
  const args = [];
  if (body.name !== undefined) {
    const v = vString(body.name, { max: 100 });
    if (!v) return Response.json({ error: "Bad name" }, { status: 400 });
    sets.push("name = ?");
    args.push(v);
  }
  if (body.roleId !== undefined) {
    const roleId = vId(body.roleId);
    const [role] = roleId ? await query("SELECT id, slug FROM admin_roles WHERE id = ?", [roleId]) : [];
    if (!role) return Response.json({ error: "Role not found" }, { status: 400 });
    if (target.role_slug === "super_admin" && role.slug !== "super_admin") {
      const [{ n }] = await query(
        `SELECT COUNT(*) AS n FROM admin_users a JOIN admin_roles r ON r.id = a.role_id
         WHERE r.slug = 'super_admin' AND a.status = 'active' AND a.id != ?`,
        [id]
      );
      if (n === 0) {
        return Response.json({ error: "Cannot demote the last active super admin" }, { status: 409 });
      }
    }
    sets.push("role_id = ?", "token_version = token_version + 1");
    args.push(roleId);
  }
  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.length < 10) {
      return Response.json({ error: "Password must be 10+ characters" }, { status: 400 });
    }
    const hash = await bcrypt.hash(body.password, Number(process.env.BCRYPT_COST || 12));
    sets.push("password_hash = ?", "token_version = token_version + 1");
    args.push(hash);
  }
  if (!sets.length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  args.push(id);
  await query(`UPDATE admin_users SET ${sets.join(", ")} WHERE id = ?`, args);
  await auditLog(gate.admin.id, "admin.update", "admin_user", id, {
    fields: Object.keys(body).filter((k) => k !== "password"),
  });
  return Response.json({ ok: true });
}
