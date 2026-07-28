import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { getSetting, setSetting } from "@/lib/server/settings";

// Media section switch:
//   sectionVisible — soft-launch. OFF (default) = the landing page hides the
//                    whole Media carousel even when videos exist;
//                    ON = the section shows once at least one video is visible.
const VISIBLE_KEY = "media_section_visible";

export async function GET() {
  const gate = await requireAdmin("media.manage");
  if (gate.error) return gate.error;
  return Response.json({ sectionVisible: (await getSetting(VISIBLE_KEY)) === "1" });
}

export async function PUT(request) {
  const gate = await requireAdmin("media.manage");
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (typeof body.sectionVisible !== "boolean") {
    return Response.json({ error: "sectionVisible must be a boolean" }, { status: 400 });
  }
  await setSetting(VISIBLE_KEY, body.sectionVisible ? "1" : "0");
  await auditLog(gate.admin.id, "media_video.settings.update", "settings", null, {
    sectionVisible: body.sectionVisible,
  });
  return Response.json({ ok: true, sectionVisible: body.sectionVisible });
}
