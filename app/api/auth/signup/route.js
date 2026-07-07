import { query } from "@/lib/server/db";
import { createUserSession, hashPassword } from "@/lib/server/auth";
import { vEmail, vPassword, vUsername } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";
import { DEFAULT_COUNTRY_ISO, findCountry } from "@/lib/geo";
import { countryFromRequest } from "@/lib/server/geo-ip";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const fields = {};
  const username = vUsername(body.username);
  const email = vEmail(body.email);
  const password = vPassword(body.password);
  // Mobile is hidden from the signup UI (client request) but the backend keeps
  // accepting + storing it for clients that still send one. Optional now.
  let mobile = null;
  const localDigits = String(body.mobile || "").replace(/[\s()-]/g, "");
  if (localDigits) {
    const dialCountry = findCountry(body.countryIso || DEFAULT_COUNTRY_ISO);
    if (dialCountry && /^\d{6,12}$/.test(localDigits)) mobile = `${dialCountry.dial}${localDigits}`;
    else fields.mobile = "Enter your number without the country code (6–12 digits)";
  }
  if (!username) fields.username = "3–30 characters: letters, numbers, underscores";
  if (!email) fields.email = "Enter a valid email";
  if (!password) fields.password = "8+ characters with at least one letter and one number";
  if (Object.keys(fields).length) {
    return Response.json({ error: "Check the highlighted fields", fields }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`signup:${ip}`, 5, 60 * 60))) {
    return Response.json({ error: "Too many signups from this network. Try later." }, { status: 429 });
  }

  // Country now comes from the request IP (geo headers, then a best-effort
  // lookup). Unknown stays NULL rather than guessing.
  const countryName = await countryFromRequest(request);

  // Username, email AND mobile (when given) must be unique.
  const clashes = await query(
    "SELECT username, email, mobile FROM users WHERE username = ? OR email = ? OR (mobile IS NOT NULL AND mobile = ?)",
    [username, email, mobile]
  );
  for (const c of clashes) {
    if (c.username === username) fields.username = "That web handle is taken";
    if (c.email === email) fields.email = "That email is already registered";
    if (mobile && c.mobile === mobile) fields.mobile = "That mobile number is already registered";
  }
  if (Object.keys(fields).length) {
    return Response.json({ error: "Already registered", fields }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  let result;
  try {
    result = await query(
      "INSERT INTO users (username, email, mobile, country, password_hash) VALUES (?, ?, ?, ?, ?)",
      [username, email, mobile, countryName, passwordHash]
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
