import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vString, vYouTubeId } from "@/lib/server/validate";

// Full list for the panel (hidden rows included), display order.
export async function GET() {
  const gate = await requireAdmin("media.manage");
  if (gate.error) return gate.error;

  const videos = await query(
    `SELECT v.id, v.title, v.youtube_id, v.sort_order, v.is_active, v.created_at,
            a.name AS created_by_name
     FROM media_videos v
     LEFT JOIN admin_users a ON a.id = v.created_by
     ORDER BY v.sort_order, v.id`
  );
  return Response.json({ videos });
}

// Add a video: the panel sends the pasted link; only the parsed id is stored.
export async function POST(request) {
  const gate = await requireAdmin("media.manage");
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const title = vString(body.title, { max: 120 }); // optional — null renders a caption-less card
  const youtubeId = vYouTubeId(body.url);
  if (!youtubeId) {
    return Response.json({ error: "That doesn't look like a YouTube link" }, { status: 400 });
  }
  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 99;

  const result = await query(
    "INSERT INTO media_videos (title, youtube_id, sort_order, created_by) VALUES (?, ?, ?, ?)",
    [title, youtubeId, sortOrder, gate.admin.id]
  );
  await auditLog(gate.admin.id, "media_video.create", "media_video", result.insertId, {
    title,
    youtubeId,
  });
  return Response.json({ ok: true, id: result.insertId }, { status: 201 });
}
