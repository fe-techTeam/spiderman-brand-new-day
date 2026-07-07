import { destroyUserSession } from "@/lib/server/auth";

export async function POST() {
  await destroyUserSession();
  return Response.json({ ok: true });
}
