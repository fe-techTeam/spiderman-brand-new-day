import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vId, vString, vYouTubeId } from "@/lib/server/validate";

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("media.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const [video] = await query("SELECT id FROM media_videos WHERE id = ?", [id]);
  if (!video) return Response.json({ error: "Not found" }, { status: 404 });

  const sets = [];
  const args = [];
  const push = (col, val) => {
    sets.push(`${col} = ?`);
    args.push(val);
  };

  if (body.title !== undefined) push("title", vString(body.title, { max: 120 })); // blank clears it
  if (body.url !== undefined) {
    const v = vYouTubeId(body.url);
    if (!v) return Response.json({ error: "That doesn't look like a YouTube link" }, { status: 400 });
    push("youtube_id", v);
  }
  if (body.sortOrder !== undefined && Number.isInteger(body.sortOrder)) push("sort_order", body.sortOrder);
  if (body.isActive !== undefined) push("is_active", body.isActive ? 1 : 0);
  if (!sets.length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  args.push(id);
  await query(`UPDATE media_videos SET ${sets.join(", ")} WHERE id = ?`, args);
  await auditLog(gate.admin.id, "media_video.update", "media_video", id, { patch: body });
  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const gate = await requireAdmin("media.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const [video] = await query("SELECT id, title, youtube_id FROM media_videos WHERE id = ?", [id]);
  if (!video) return Response.json({ error: "Not found" }, { status: 404 });

  await query("DELETE FROM media_videos WHERE id = ?", [id]);
  await auditLog(gate.admin.id, "media_video.delete", "media_video", id, {
    title: video.title,
    youtubeId: video.youtube_id,
  });
  return Response.json({ ok: true });
}
