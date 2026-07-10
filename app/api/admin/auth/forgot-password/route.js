import crypto from "node:crypto";
import { query } from "@/lib/server/db";
import { vEmail } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";
import { emailBaseUrl, isEmailConfigured, sendPasswordResetEmail } from "@/lib/server/email";

// Admin self-service reset — same shape as the portal flow (always 200,
// hashed single-use token, 30-min expiry) but against admin_users and the
// admin reset page. Sends via SES when configured; dev echoes the link.

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = vEmail(body.email);
  // Always 200 — never reveal whether an admin account exists.
  const ok = Response.json({ ok: true, message: "If that email belongs to an admin, a reset link is on its way." });
  if (!email) return ok;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`admin-forgot:${ip}`, 5, 60 * 60))) return ok;

  const [admin] = await query("SELECT id FROM admin_users WHERE email = ? AND status = 'active'", [email]);
  if (!admin) return ok;

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await query(
    `INSERT INTO admin_password_reset_tokens (admin_user_id, token_hash, expires_at)
     VALUES (?, ?, NOW(3) + INTERVAL 30 MINUTE)`,
    [admin.id, tokenHash]
  );

  const resetUrl = `${emailBaseUrl()}/admin/reset-password?token=${token}`;
  if (isEmailConfigured()) {
    try {
      await sendPasswordResetEmail({ to: email, resetUrl, admin: true });
    } catch (err) {
      console.error(`[admin-forgot-password] SES send failed for ${email}:`, err);
    }
    return ok;
  }
  console.log(`[admin-forgot-password] reset link for ${email}: ${resetUrl}`);
  if (process.env.NODE_ENV !== "production") {
    return Response.json({ ok: true, message: "Dev mode: use the link below.", resetUrl });
  }
  return ok;
}
