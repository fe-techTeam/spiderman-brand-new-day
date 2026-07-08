// Portal-user Data Access Layer — JWT session create/verify for fans.
// Separate cookie + secret from the admin realm. See BACKEND.md §5.2.
// (Consumed by the Phase-1..6 portal APIs; established now so the contract
// is fixed alongside the admin panel.)

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { query } from "@/lib/server/db";

export const SESSION_COOKIE = "bnd_session";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createUserSession(user) {
  const token = await new SignJWT({
    sub: String(user.id),
    un: user.username,
    tv: user.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function destroyUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Full verification: JWT + fresh status/token_version read. Disabled users
 * are cut off on their next request, mid-session. Returns null if not authed.
 */
export async function verifyUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] }));
  } catch {
    return null;
  }
  if (!payload?.sub) return null;

  const rows = await query(
    `SELECT id, username, status, token_version, avatar_id, spidey_code,
            state, country, quiz_completed_at, forum_ban_until
     FROM users WHERE id = ?`,
    [payload.sub]
  );
  const user = rows[0];
  if (!user || user.status !== "active") return null;
  if (user.token_version !== payload.tv) return null;
  return user;
}

export async function requireUser() {
  const user = await verifyUserSession();
  if (!user) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  return { user };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, Number(process.env.BCRYPT_COST || 12));
}

/** identifier = email OR username (users can't be expected to remember which). */
export async function verifyUserPassword(identifier, password) {
  const id = identifier.toLowerCase().trim();
  const rows = await query(
    `SELECT id, username, email, password_hash, status, token_version
     FROM users WHERE email = ? OR username = ?
     LIMIT 1`,
    [id, id]
  );
  const user = rows[0];
  const hash =
    user?.password_hash ||
    "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpG0vBRBz4b0BhPzWupfIkT3bXjW2";
  const ok = await bcrypt.compare(password, hash);
  if (!ok || !user) return null;
  if (user.status !== "active") return { disabled: true };
  return user;
}
