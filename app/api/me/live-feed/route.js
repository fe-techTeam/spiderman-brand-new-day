import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

// The member's own Live Feed submissions with moderation status (the
// "Your submissions" strip). The media gateway already lets owners preview
// their pending files.
export async function GET() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const rows = await query(
    `SELECT lf.id, lf.media_id, lf.status, lf.rejection_reason, lf.created_at, m.kind
     FROM live_feed lf JOIN media m ON m.id = lf.media_id
     WHERE lf.user_id = ? ORDER BY lf.id DESC LIMIT 50`,
    [gate.user.id]
  );
  return Response.json({
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      rejection_reason: r.rejection_reason,
      created_at: r.created_at,
      url: `/api/media/${r.media_id}`,
    })),
  });
}
