import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vString } from "@/lib/server/validate";

export async function GET() {
  const gate = await requireAdmin("avatars.manage");
  if (gate.error) return gate.error;

  const avatars = await query(
    `SELECT a.id, a.slug, a.name, a.emoji, a.tagline, a.description, a.color,
            a.sort_order, a.is_active,
            (SELECT COUNT(*) FROM users u WHERE u.avatar_id = a.id) AS user_count
     FROM avatars a ORDER BY a.sort_order, a.id`
  );
  return Response.json({ avatars });
}

export async function POST(request) {
  const gate = await requireAdmin("avatars.manage");
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const name = vString(body.name, { max: 60 });
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  const slug = (vString(body.slug, { max: 40 }) || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const emoji = vString(body.emoji, { max: 16 }) || "";
  const tagline = vString(body.tagline, { max: 200 }) || "";
  const description = typeof body.description === "string" ? body.description.slice(0, 2000) : null;
  const color = /^#[0-9a-fA-F]{6}$/.test(body.color || "") ? body.color : null;
  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 99;

  try {
    const result = await query(
      `INSERT INTO avatars (slug, name, emoji, tagline, description, color, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slug, name, emoji, tagline, description, color, sortOrder]
    );
    await auditLog(gate.admin.id, "avatar.create", "avatar", result.insertId, { name, slug });
    return Response.json({ ok: true, id: result.insertId }, { status: 201 });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return Response.json({ error: "Slug already exists" }, { status: 409 });
    }
    throw err;
  }
}
