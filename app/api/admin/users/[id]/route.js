import { query } from "@/lib/server/db";
import { requireAdmin, auditLog } from "@/lib/server/admin-auth";
import { vEnum, vId } from "@/lib/server/validate";

export async function GET(request, { params }) {
  const gate = await requireAdmin("users.view");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const [user] = await query(
    `SELECT u.id, u.username, u.email, u.mobile, u.status, u.spidey_code, u.tagline,
            u.state, u.country, u.signup_ip, u.last_login_ip,
            u.created_at, u.last_login_at, u.quiz_completed_at,
            a.name AS avatar_name, a.emoji AS avatar_emoji
     FROM users u LEFT JOIN avatars a ON a.id = u.avatar_id
     WHERE u.id = ?`,
    [id]
  );
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  const [activity] = await query(
    `SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ?) AS posts,
      (SELECT COUNT(*) FROM comments WHERE user_id = ?) AS comments,
      (SELECT COUNT(*) FROM mj_messages WHERE user_id = ?) AS mjMessages,
      (SELECT COUNT(*) FROM fan_art WHERE user_id = ?) AS fanArt`,
    [id, id, id, id]
  );
  const [submission] = await query(
    `SELECT s.answers, s.scores, s.tie_broken, s.updated_at, a.name AS avatar_name
     FROM quiz_submissions s JOIN avatars a ON a.id = s.assigned_avatar_id
     WHERE s.user_id = ?`,
    [id]
  );

  return Response.json({ user, activity, quiz: submission || null });
}

export async function PATCH(request, { params }) {
  const gate = await requireAdmin("users.manage");
  if (gate.error) return gate.error;
  const { id: rawId } = await params;
  const id = vId(rawId);
  if (!id) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = vEnum(body.action, ["disable", "enable"]);
  if (!action) return Response.json({ error: "Bad action" }, { status: 400 });

  const [user] = await query("SELECT id, status FROM users WHERE id = ?", [id]);
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  const status = action === "disable" ? "disabled" : "active";
  // token_version bump kills every live session on its next request.
  await query(
    "UPDATE users SET status = ?, token_version = token_version + 1 WHERE id = ?",
    [status, id]
  );
  await auditLog(gate.admin.id, `user.${action}`, "user", id, { from: user.status, to: status });
  return Response.json({ ok: true, status });
}
