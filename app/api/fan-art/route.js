import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { decodeCursor, encodeCursor } from "@/lib/server/forum";
import { saveImageUpload } from "@/lib/server/uploads";
import { vString } from "@/lib/server/validate";
import { containsProfanity, profanityResponse } from "@/lib/server/profanity";
import { rateLimit } from "@/lib/server/rate-limit";

// Public gallery — approved fan art only.
export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(30, Math.max(1, Number(sp.get("limit")) || 12));
  const cursor = decodeCursor(sp.get("cursor"));

  const args = [];
  let where = "WHERE f.status = 'approved'";
  if (cursor?.id) {
    where += " AND f.id < ?";
    args.push(Number(cursor.id));
  }
  const rows = await query(
    `SELECT f.id, f.title, f.description, f.media_id, f.created_at, u.username
     FROM fan_art f JOIN users u ON u.id = f.user_id
     ${where} ORDER BY f.id DESC LIMIT ${limit + 1}`,
    args
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  return Response.json({
    items: page.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      imageUrl: `/api/media/${f.media_id}`,
      createdAt: f.created_at,
      author: { username: f.username },
    })),
    nextCursor: hasMore ? encodeCursor({ id: page[page.length - 1].id }) : null,
  });
}

// Multipart upload → media row + pending fan_art row.
export async function POST(request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const user = gate.user;
  if (!(await rateLimit(`fanart:${user.id}`, 5, 60 * 60))) {
    return Response.json({ error: "Upload limit reached — try again later." }, { status: 429 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const title = vString(form.get("title"), { min: 2, max: 200 });
  const description = form.get("description") ? vString(form.get("description"), { max: 500 }) : null;
  if (!title) return Response.json({ error: "Title must be 2–200 characters" }, { status: 400 });
  if (containsProfanity(title, description)) return profanityResponse("submission");

  let saved;
  try {
    saved = await saveImageUpload(form.get("image"), "fan-art");
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const fanArtId = await withTransaction(async (conn) => {
    const [media] = await conn.execute(
      "INSERT INTO media (user_id, kind, storage, file_path, mime_type, size_bytes) VALUES (?, 'image', ?, ?, ?, ?)",
      [user.id, saved.storage, saved.filePath, saved.mime, saved.size]
    );
    const [art] = await conn.execute(
      "INSERT INTO fan_art (user_id, media_id, title, description) VALUES (?, ?, ?, ?)",
      [user.id, media.insertId, title, description]
    );
    return art.insertId;
  });

  return Response.json(
    { id: fanArtId, status: "pending", message: "Uploaded! Your art appears in the gallery once approved." },
    { status: 201 }
  );
}
