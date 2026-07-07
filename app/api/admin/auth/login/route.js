import { query } from "@/lib/server/db";
import { createAdminSession, verifyAdminPassword } from "@/lib/server/admin-auth";
import { vEmail, vString } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = vEmail(body.email);
  const password = vString(body.password, { max: 128 });
  if (!email || !password) {
    return Response.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`admin-login:${ip}`, 10, 15 * 60))) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const admin = await verifyAdminPassword(email, password);
  if (!admin || admin.disabled) {
    // Generic error — never reveal whether the email exists or is disabled.
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createAdminSession(admin);
  await query("UPDATE admin_users SET last_login_at = NOW(3) WHERE id = ?", [admin.id]);
  return Response.json({
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role_slug },
  });
}
