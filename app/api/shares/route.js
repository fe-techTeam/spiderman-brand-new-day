// Logs a click of the Share button — one row per click, repeats included by
// design (the client wants to see every share attempt). No body needed: the
// client fires this via sendBeacon, which sends an empty POST. The generous
// rate limit is purely a runaway-script guard, not a UX constraint.

import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";

export async function POST() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  if (!(await rateLimit(`share:${gate.user.id}`, 120, 60 * 60))) {
    return Response.json({ error: "Too many shares — try again later." }, { status: 429 });
  }
  await query("INSERT INTO shares (user_id) VALUES (?)", [gate.user.id]);
  return Response.json({ ok: true }, { status: 201 });
}
