import { query } from "@/lib/server/db";
import { createUserSession, verifyUserPassword } from "@/lib/server/auth";
import { vString } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  // Accepts email OR username ("identifier"; legacy "email" key still works).
  const identifier = vString(body.identifier ?? body.email, { min: 3, max: 255 });
  const password = vString(body.password, { max: 128 });
  if (!identifier || !password) {
    return Response.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`login:${ip}:${identifier.toLowerCase()}`, 10, 15 * 60))) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const user = await verifyUserPassword(identifier, password);
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
