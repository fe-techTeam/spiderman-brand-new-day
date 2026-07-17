import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { deleteObject } from "@/lib/server/storage";
import { vId } from "@/lib/server/validate";

// Member cancel: a submitter can pull their own drop while it's pending, or
// clear a rejected one. Reviewed items (approved/hidden) stay admin-only —
// their lifecycle is the moderation status, not deletion.
export async function DELETE(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const [row] = await query(
    `SELECT lf.id, lf.user_id, lf.status, lf.media_id, m.storage, m.file_path
     FROM live_feed lf JOIN media m ON m.id = lf.media_id
     WHERE lf.id = ?`,
    [id]
  );
  // 404 (not 403) for someone else's row — don't leak that the id exists.
  if (!row || Number(row.user_id) !== Number(gate.user.id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (row.status !== "pending" && row.status !== "rejected") {
    return Response.json(
      { error: "This drop has already been reviewed — it can't be removed here." },
      { status: 403 }
    );
  }

  await withTransaction(async (conn) => {
    await conn.execute("DELETE FROM live_feed WHERE id = ?", [id]);
    await conn.execute("DELETE FROM media WHERE id = ?", [row.media_id]);
  });
  // Rows are gone (the gateway now 404s); tidy the stored bytes best-effort.
  await deleteObject(row).catch(() => {});

  return Response.json({ ok: true });
}
