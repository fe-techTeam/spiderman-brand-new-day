import crypto from "node:crypto";
import { query, withTransaction } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/auth";
import { vPassword, vString } from "@/lib/server/validate";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = vString(body.token, { min: 20, max: 100 });
  const password = vPassword(body.password);
  if (!token) return Response.json({ error: "Invalid or expired link" }, { status: 400 });
  if (!password) {
    return Response.json(
      { error: "Password needs 8+ characters with at least one letter and one number" },
      { status: 400 }
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [row] = await query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW(3)`,
    [tokenHash]
  );
  if (!row) return Response.json({ error: "Invalid or expired link" }, { status: 400 });

  const passwordHash = await hashPassword(password);
  await withTransaction(async (conn) => {
    await conn.execute("UPDATE password_reset_tokens SET used_at = NOW(3) WHERE id = ?", [row.id]);
    // token_version bump invalidates every outstanding session.
    await conn.execute(
      "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
      [passwordHash, row.user_id]
    );
  });

  return Response.json({ ok: true, message: "Password updated — log in with your new password." });
}
