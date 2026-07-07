import { query } from "@/lib/server/db";
import { createUserSession, hashPassword } from "@/lib/server/auth";
import { vEmail, vPassword, vString, vUsername } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const fields = {};
  const username = vUsername(body.username);
  const email = vEmail(body.email);
  const mobile = body.mobile ? vString(body.mobile, { min: 6, max: 20 }) : null;
  const password = vPassword(body.password);
  if (!username) fields.username = "3–30 characters: letters, numbers, underscores";
  if (!email) fields.email = "Enter a valid email";
  if (body.mobile && !mobile) fields.mobile = "Enter a valid mobile number";
  if (!password) fields.password = "8+ characters with at least one letter and one number";
  if (Object.keys(fields).length) {
    return Response.json({ error: "Check the highlighted fields", fields }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`signup:${ip}`, 5, 60 * 60))) {
    return Response.json({ error: "Too many signups from this network. Try later." }, { status: 429 });
  }

  const clashes = await query(
    "SELECT username, email FROM users WHERE username = ? OR email = ?",
    [username, email]
  );
  for (const c of clashes) {
    if (c.username === username) fields.username = "That web handle is taken";
    if (c.email === email) fields.email = "That email is already registered";
  }
  if (Object.keys(fields).length) {
    return Response.json({ error: "Already registered", fields }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    "INSERT INTO users (username, email, mobile, password_hash) VALUES (?, ?, ?, ?)",
    [username, email, mobile, passwordHash]
  );

  const user = { id: result.insertId, username, token_version: 0 };
  await createUserSession(user);
  return Response.json(
    { user: { id: result.insertId, username }, needsQuiz: true },
    { status: 201 }
  );
}
