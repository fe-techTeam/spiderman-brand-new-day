import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const rows = await query(
    `SELECT id, body, status, rejection_reason, created_at
     FROM mj_messages WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    [gate.user.id]
  );
  return Response.json({ messages: rows });
}
