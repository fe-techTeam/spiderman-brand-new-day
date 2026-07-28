// Public list for the landing page "Media" section — active videos in display
// order. Public like /api/share-config: it only reveals what the section
// itself renders. The admin soft-launch switch (media_section_visible) and an
// empty list look identical from outside: no videos, section hidden.

import { query } from "@/lib/server/db";
import { getSetting } from "@/lib/server/settings";

export async function GET() {
  if ((await getSetting("media_section_visible")) !== "1") {
    return Response.json({ videos: [] });
  }
  const rows = await query(
    "SELECT id, title, youtube_id FROM media_videos WHERE is_active = 1 ORDER BY sort_order, id"
  );
  return Response.json({
    videos: rows.map((r) => ({ id: r.id, title: r.title, youtubeId: r.youtube_id })),
  });
}
