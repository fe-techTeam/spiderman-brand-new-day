import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

// The bell-open behavior: one UPDATE marks everything read (the UI has no
// per-item read action).
export async function POST() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  await query(
    "UPDATE notifications SET read_at = NOW(3) WHERE user_id = ? AND read_at IS NULL",
    [gate.user.id]
  );
  return Response.json({ ok: true, unreadCount: 0 });
}
