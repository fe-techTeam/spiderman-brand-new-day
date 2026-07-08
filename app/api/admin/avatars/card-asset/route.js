// Uploads the avatar's final collectible-card artwork (the asset revealed on
// the quiz result screen). Returns the public URL to store in badge_asset via
// the avatar create/update endpoints — the file itself is avatar-agnostic, so
// it also works while composing a brand-new avatar that has no id yet.

import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { saveUpload } from "@/lib/server/uploads";

export async function POST(request) {
  const gate = await requireAdmin("avatars.manage");
  if (gate.error) return gate.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveUpload(file, "avatar-cards");
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const filename = saved.key.slice("avatar-cards/".length);
  await auditLog(gate.admin.id, "avatar.card_upload", "avatar", null, {
    key: saved.key,
    size: saved.size,
  });
  return Response.json({ url: `/api/avatar-cards/${filename}` }, { status: 201 });
}
