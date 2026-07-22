import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { getSetting, setSetting } from "@/lib/server/settings";

// Live Feed switches:
//   enabled     — member uploads. OFF (default) = only admins can post;
//                 ON = members can submit media into the moderation queue.
//   navVisible  — soft-launch. OFF (default) = the site navbar hides the
//                 Live Feed link (the URL itself stays reachable);
//                 ON = the link shows on the website.
//   shareEnabled — the reel's Share button. OFF (default) = hidden;
//                 ON = members can share the Webshots link from the reel.
const UPLOADS_KEY = "live_feed_user_uploads";
const NAV_KEY = "live_feed_nav_visible";
const SHARE_KEY = "live_feed_share";

export async function GET() {
  const gate = await requireAdmin("livefeed.manage");
  if (gate.error) return gate.error;
  return Response.json({
    enabled: (await getSetting(UPLOADS_KEY)) === "1",
    navVisible: (await getSetting(NAV_KEY)) === "1",
    shareEnabled: (await getSetting(SHARE_KEY)) === "1",
  });
}

export async function PUT(request) {
  const gate = await requireAdmin("livefeed.manage");
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const patch = {};
  for (const key of ["enabled", "navVisible", "shareEnabled"]) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "boolean") {
      return Response.json({ error: `${key} must be a boolean` }, { status: 400 });
    }
    patch[key] = body[key];
  }
  if (!Object.keys(patch).length) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (patch.enabled !== undefined) await setSetting(UPLOADS_KEY, patch.enabled ? "1" : "0");
  if (patch.navVisible !== undefined) await setSetting(NAV_KEY, patch.navVisible ? "1" : "0");
  if (patch.shareEnabled !== undefined) await setSetting(SHARE_KEY, patch.shareEnabled ? "1" : "0");
  await auditLog(gate.admin.id, "livefeed.settings.update", "settings", null, patch);
  return Response.json({ ok: true, ...patch });
}
