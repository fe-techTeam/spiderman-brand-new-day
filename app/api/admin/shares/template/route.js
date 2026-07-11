import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { getSetting, setSetting } from "@/lib/server/settings";
import { vString } from "@/lib/server/validate";

// The share message template. Variables the portal substitutes at share time:
// {AvatarIdentity} → the member's identity name + emoji, {Link} → their
// personal share URL.
const KEY = "share_message_template";

export async function GET() {
  const gate = await requireAdmin("shares.view");
  if (gate.error) return gate.error;
  return Response.json({ template: (await getSetting(KEY)) || "" });
}

export async function PUT(request) {
  const gate = await requireAdmin("shares.view");
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const template = vString(body.template, { min: 10, max: 1000 });
  if (!template) {
    return Response.json({ error: "Template must be 10–1000 characters" }, { status: 400 });
  }
  if (!template.includes("{Link}")) {
    return Response.json({ error: "Template must include {Link} — without it the shared message has no way back to the site" }, { status: 400 });
  }

  await setSetting(KEY, template);
  await auditLog(gate.admin.id, "shares.template.update", "settings", null, { length: template.length });
  return Response.json({ ok: true });
}
