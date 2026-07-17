// Whether the site navbar should link to the Live Feed (admin soft-launch
// toggle). Public like /api/share-config — it only reveals a boolean the
// navbar itself would reveal; the feed API stays members-only regardless.

import { getSetting } from "@/lib/server/settings";

export async function GET() {
  return Response.json({ navVisible: (await getSetting("live_feed_nav_visible")) === "1" });
}
