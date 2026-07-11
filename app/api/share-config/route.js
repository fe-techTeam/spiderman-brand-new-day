// The admin-editable share message template, for the Share button. Public
// like /api/stats — the template is outbound marketing copy, not a secret,
// and the client keeps a built-in fallback if this ever fails.

import { getSetting } from "@/lib/server/settings";

export async function GET() {
  const template = await getSetting("share_message_template");
  return Response.json({ template: template || null });
}
