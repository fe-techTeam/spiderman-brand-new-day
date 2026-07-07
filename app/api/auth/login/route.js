import { query } from "@/lib/server/db";
import { createUserSession, verifyUserPassword } from "@/lib/server/auth";
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
  if (!(await rateLimit(`login:${ip}:${email}`, 10, 15 * 60))) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const user = await verifyUserPassword(email, password);
  if (!user || user.disabled) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createUserSession(user);
  await query("UPDATE users SET last_login_at = NOW(3) WHERE id = ?", [user.id]);

  const [me] = await query(
    "SELECT id, username, quiz_completed_at FROM users WHERE id = ?",
    [user.id]
  );
  return Response.json({
    user: { id: me.id, username: me.username },
    needsQuiz: !me.quiz_completed_at,
  });
}
