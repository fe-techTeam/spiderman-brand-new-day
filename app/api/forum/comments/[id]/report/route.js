import { requireUser } from "@/lib/server/auth";
import { submitReport } from "@/lib/server/reports";
import { vId, vString } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/rate-limit";

// Report a comment or reply (both live in the comments table) to the moderators.
export async function POST(request, { params }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const commentId = vId(rawId);
  if (!commentId) return Response.json({ error: "Not found" }, { status: 404 });

  if (!(await rateLimit(`report:${gate.user.id}`, 20, 60 * 60))) {
    return Response.json({ error: "You're reporting too fast — take a breath." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = vString(body.reason, { min: 3, max: 500 });
  if (!reason) {
    return Response.json({ error: "Tell us why (a few words is enough)" }, { status: 400 });
  }

  const result = await submitReport({
    reporterId: gate.user.id,
    entityType: "comment",
    entityId: commentId,
    reason,
  });
  if (result.error) {
    return Response.json({ error: result.error, code: result.code }, { status: result.status });
  }
  return Response.json({ ok: true }, { status: 201 });
}
