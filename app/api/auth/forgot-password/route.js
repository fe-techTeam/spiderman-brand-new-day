import crypto from "node:crypto";
import { query } from "@/lib/server/db";
import { vEmail } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";
import { emailBaseUrl, isEmailConfigured, sendPasswordResetEmail } from "@/lib/server/email";

// Reset links go out via AWS SES once SES_FROM_EMAIL is configured (see
// lib/server/email.js). Without it, dev keeps returning the link in the
// response; production only logs.

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = vEmail(body.email);
  // Always 200 — never reveal whether an email is registered.
  const ok = Response.json({ ok: true, message: "If that email is registered, a reset link is on its way." });
  if (!email) return ok;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`forgot:${ip}`, 5, 60 * 60))) return ok;

  const [user] = await query("SELECT id FROM users WHERE email = ? AND status = 'active'", [email]);
  if (!user) return ok;

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, NOW(3) + INTERVAL 30 MINUTE)`,
    [user.id, tokenHash]
  );

  const resetUrl = `${emailBaseUrl()}/reset-password?token=${token}`;
  if (isEmailConfigured()) {
    // Still 200 on failure — a send error must not reveal the email exists.
    try {
      await sendPasswordResetEmail({ to: email, resetUrl });
    } catch (err) {
      console.error(`[forgot-password] SES send failed for ${email}:`, err);
    }
    return ok;
  }
  console.log(`[forgot-password] reset link for ${email}: ${resetUrl}`);
  if (process.env.NODE_ENV !== "production") {
    return Response.json({ ok: true, message: "Dev mode: use the link below.", resetUrl });
  }
  return ok;
}
