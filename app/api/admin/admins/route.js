import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEmail, vId, vString } from "@/lib/server/validate";
import bcrypt from "bcryptjs";

export async function GET() {
  const gate = await requireAdmin("admins.manage");
  if (gate.error) return gate.error;

  const admins = await query(
    `SELECT a.id, a.name, a.email, a.status, a.last_login_at, a.created_at,
            r.id AS role_id, r.slug AS role_slug, r.name AS role_name
     FROM admin_users a JOIN admin_roles r ON r.id = a.role_id
     ORDER BY a.id`
  );
  const roles = await query("SELECT id, slug, name, description FROM admin_roles ORDER BY id");
  return Response.json({ admins, roles });
}

export async function POST(request) {
  const gate = await requireAdmin("admins.manage");
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const name = vString(body.name, { max: 100 });
  const email = vEmail(body.email);
  const roleId = vId(body.roleId);
  const password = typeof body.password === "string" && body.password.length >= 10 ? body.password : null;
  if (!name || !email || !roleId || !password) {
    return Response.json(
      { error: "name, email, roleId and a password of 10+ characters are required" },
      { status: 400 }
    );
  }

  const [role] = await query("SELECT id FROM admin_roles WHERE id = ?", [roleId]);
  if (!role) return Response.json({ error: "Role not found" }, { status: 400 });

  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST || 12));
  try {
    const result = await query(
      "INSERT INTO admin_users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)",
      [name, email, hash, roleId]
    );
    await auditLog(gate.admin.id, "admin.create", "admin_user", result.insertId, { email, roleId });
    return Response.json({ ok: true, id: result.insertId }, { status: 201 });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }
    throw err;
  }
}
