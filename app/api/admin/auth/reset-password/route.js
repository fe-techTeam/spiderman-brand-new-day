import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "@/lib/server/db";
import { vString } from "@/lib/server/validate";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = vString(body.token, { min: 20, max: 100 });
  const password = typeof body.password === "string" ? body.password : "";
  if (!token) return Response.json({ error: "Invalid or expired link" }, { status: 400 });
  // Same bar as the in-panel "Reset password" dialog (10+ chars), plus the
  // portal's letter+number rule.
  if (password.length < 10 || password.length > 128 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return Response.json(
      { error: "Password needs 10+ characters with at least one letter and one number" },
      { status: 400 }
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [row] = await query(
    `SELECT t.id, t.admin_user_id FROM admin_password_reset_tokens t
     JOIN admin_users a ON a.id = t.admin_user_id AND a.status = 'active'
     WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW(3)`,
    [tokenHash]
  );
  if (!row) return Response.json({ error: "Invalid or expired link" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST || 12));
  await withTransaction(async (conn) => {
    await conn.execute("UPDATE admin_password_reset_tokens SET used_at = NOW(3) WHERE id = ?", [row.id]);
    // token_version bump invalidates every outstanding admin session.
    await conn.execute(
      "UPDATE admin_users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
      [passwordHash, row.admin_user_id]
    );
  });

  return Response.json({ ok: true, message: "Password updated — sign in with your new password." });
}
