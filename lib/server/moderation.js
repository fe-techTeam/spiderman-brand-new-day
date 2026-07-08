// Moderation strike ladder + posting-ban enforcement. See migration 009.
//
// A "strike" is a moderator takedown of the user's reported content. The Nth
// cumulative strike escalates a consequence:
//   1 → 24h posting ban   2 → 48h   3 → 1 week   4+ → full account suspension
// Posting bans block forum posts/comments/replies and MJ Wall messages; the
// full suspension flips users.status to 'disabled' (auth then cuts them off
// everywhere).

const LADDER = {
  1: { hours: 24, label: "24 hours" },
  2: { hours: 48, label: "48 hours" },
  3: { hours: 24 * 7, label: "one week" },
};

/** Consequence for the given cumulative strike count (1-based). */
export function consequenceForStrikes(count) {
  if (count >= 4) return { type: "platform_ban", label: "a full account suspension" };
  const rung = LADDER[count] || LADDER[1];
  return { type: "posting_ban", hours: rung.hours, label: rung.label };
}

/** The message shown to the offender in their notifications after a takedown. */
export function takedownMessage(noun, consequence) {
  if (consequence.type === "platform_ban") {
    return `Your ${noun} was removed after being reported. After repeated violations your account has been suspended — you can no longer use the platform.`;
  }
  return `Your ${noun} was removed by a moderator after being reported. You can't post on the Forum or MJ Wall for ${consequence.label}.`;
}

/** Ban end Date if the user is currently blocked from posting, else null. */
export function postingBlockedUntil(user) {
  const raw = user?.forum_ban_until;
  if (!raw) return null;
  const until = new Date(raw);
  return Number.isFinite(until.getTime()) && until.getTime() > Date.now() ? until : null;
}

// TZ-independent "how much longer" phrasing — avoids leaking server timezone.
function humanRemaining(until) {
  const ms = until.getTime() - Date.now();
  const hours = Math.ceil(ms / 3_600_000);
  if (hours <= 1) return "less than an hour";
  if (hours < 48) return `about ${hours} hours`;
  return `about ${Math.ceil(hours / 24)} days`;
}

/**
 * Guard for posting routes. Returns a 403 Response when the user is serving a
 * posting ban, else null. Usage:
 *   const blocked = postingBlockedResponse(gate.user);
 *   if (blocked) return blocked;
 */
export function postingBlockedResponse(user) {
  const until = postingBlockedUntil(user);
  if (!until) return null;
  return Response.json(
    {
      error: `You're suspended from posting for ${humanRemaining(until)} more — see your notifications for details.`,
      code: "posting_suspended",
      until: until.toISOString(),
    },
    { status: 403 }
  );
}
