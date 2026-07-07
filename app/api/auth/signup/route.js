import { query } from "@/lib/server/db";
import { createUserSession, hashPassword } from "@/lib/server/auth";
import { vEmail, vPassword, vUsername } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";
import { DEFAULT_COUNTRY_ISO, findCountry } from "@/lib/geo";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const fields = {};
  const username = vUsername(body.username);
  const email = vEmail(body.email);
  const password = vPassword(body.password);
  // Country comes from the dial-code dropdown (client request: no location
  // question later — the code tells us the country; IP fallback may come later).
  const country = findCountry(body.countryIso || DEFAULT_COUNTRY_ISO);
  const localDigits = String(body.mobile || "").replace(/[\s()-]/g, "");
  const mobile = country && /^\d{6,12}$/.test(localDigits) ? `${country.dial}${localDigits}` : null;
  if (!username) fields.username = "3–30 characters: letters, numbers, underscores";
  if (!email) fields.email = "Enter a valid email";
  if (!country) fields.mobile = "Pick a country code";
  else if (!mobile) fields.mobile = "Enter your number without the country code (6–12 digits)";
  if (!password) fields.password = "8+ characters with at least one letter and one number";
  if (Object.keys(fields).length) {
    return Response.json({ error: "Check the highlighted fields", fields }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`signup:${ip}`, 5, 60 * 60))) {
    return Response.json({ error: "Too many signups from this network. Try later." }, { status: 429 });
  }

  // Username, email AND mobile are all unique (DB unique keys back these checks).
  const clashes = await query(
    "SELECT username, email, mobile FROM users WHERE username = ? OR email = ? OR mobile = ?",
    [username, email, mobile]
  );
  for (const c of clashes) {
    if (c.username === username) fields.username = "That web handle is taken";
    if (c.email === email) fields.email = "That email is already registered";
    if (c.mobile === mobile) fields.mobile = "That mobile number is already registered";
  }
  if (Object.keys(fields).length) {
    return Response.json({ error: "Already registered", fields }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  let result;
  try {
    result = await query(
      "INSERT INTO users (username, email, mobile, country, password_hash) VALUES (?, ?, ?, ?, ?)",
      [username, email, mobile, country.name, passwordHash]
    );
  } catch (err) {
    // Race with a concurrent signup — the unique keys are the real guarantee.
    if (err.code === "ER_DUP_ENTRY") {
      return Response.json(
        { error: "Already registered", fields: { email: "Those details are already registered" } },
        { status: 409 }
      );
    }
    throw err;
  }

  const user = { id: result.insertId, username, token_version: 0 };
  await createUserSession(user);
  return Response.json(
    { user: { id: result.insertId, username }, needsQuiz: true },
    { status: 201 }
  );
}
