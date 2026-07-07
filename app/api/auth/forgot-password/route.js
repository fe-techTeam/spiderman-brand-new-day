import crypto from "node:crypto";
import { query } from "@/lib/server/db";
import { vEmail } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";

// No email provider is wired yet (see BACKEND.md §16.5): in development the
// reset link is returned in the response and logged; in production this is the
// seam where the mail service plugs in.

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

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  console.log(`[forgot-password] reset link for ${email}: ${resetUrl}`);
  if (process.env.NODE_ENV !== "production") {
    return Response.json({ ok: true, message: "Dev mode: use the link below.", resetUrl });
  }
  return ok;
}
