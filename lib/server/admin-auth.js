// Admin Data Access Layer — session creation/verification, permission checks,
// audit logging. Completely separate from portal-user auth (different table,
// cookie and secret). See BACKEND.md §5.3 / §11.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { query } from "@/lib/server/db";

export const ADMIN_COOKIE = "bnd_admin_session";

function secret() {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s) throw new Error("ADMIN_JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createAdminSession(admin) {
  const token = await new SignJWT({
    sub: String(admin.id),
    role: admin.role_slug,
    tv: admin.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.ADMIN_JWT_EXPIRES_IN || "8h")
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

/** JWT-only check (no DB) — used by proxy.js for the optimistic redirect. */
export async function verifyAdminToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Full session verification: JWT + fresh DB read (status, token_version) +
 * the role's current permission set. Returns null when not authenticated.
 * This — not the proxy — is the security boundary.
 */
export async function verifyAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAdminToken(token);
  if (!payload?.sub) return null;

  const rows = await query(
    `SELECT a.id, a.name, a.email, a.status, a.token_version,
            r.slug AS role_slug, r.name AS role_name
     FROM admin_users a JOIN admin_roles r ON r.id = a.role_id
     WHERE a.id = ?`,
    [payload.sub]
  );
  const admin = rows[0];
  if (!admin || admin.status !== "active") return null;
  if (admin.token_version !== payload.tv) return null;

  const permRows = await query(
    `SELECT p.slug FROM admin_permissions p
     JOIN admin_role_permissions rp ON rp.permission_id = p.id
     JOIN admin_roles r ON r.id = rp.role_id
     WHERE r.slug = ?`,
    [admin.role_slug]
  );
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role_slug,
    roleName: admin.role_name,
    permissions: new Set(permRows.map((r) => r.slug)),
  };
}

/**
 * Route-handler guard. Usage:
 *   const gate = await requireAdmin("mj.review");
 *   if (gate.error) return gate.error;
 *   const admin = gate.admin;
 */
export async function requireAdmin(permission) {
  const admin = await verifyAdminSession();
  if (!admin) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (permission && !admin.permissions.has(permission)) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin };
}

export async function verifyAdminPassword(email, password) {
  const rows = await query(
    `SELECT a.id, a.name, a.email, a.password_hash, a.status, a.token_version,
            r.slug AS role_slug
     FROM admin_users a JOIN admin_roles r ON r.id = a.role_id
     WHERE a.email = ?`,
    [email.toLowerCase().trim()]
  );
  const admin = rows[0];
  // Compare against a dummy hash when the account doesn't exist so response
  // timing doesn't reveal which emails are registered.
  const hash =
    admin?.password_hash ||
    "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpG0vBRBz4b0BhPzWupfIkT3bXjW2";
  const ok = await bcrypt.compare(password, hash);
  if (!ok || !admin) return null;
  if (admin.status !== "active") return { disabled: true };
  return admin;
}

/** Every admin mutation writes one audit row. */
export async function auditLog(adminId, action, entityType, entityId, meta = null) {
  await query(
    `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, meta)
     VALUES (?, ?, ?, ?, ?)`,
    [adminId, action, entityType, entityId ?? null, meta ? JSON.stringify(meta) : null]
  );
}
