import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const rows = await query(
    `SELECT id, title, description, media_id, status, rejection_reason, created_at
     FROM fan_art WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    [gate.user.id]
  );
  return Response.json({
    items: rows.map((f) => ({ ...f, imageUrl: `/api/media/${f.media_id}` })),
  });
}
