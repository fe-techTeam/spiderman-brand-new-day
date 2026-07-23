// Shared Webshots (live_feed) helpers used by more than one route.

// Display author for a feed row. Precedence: admin-set attribution → member
// handle → house account ("Spidey Admin"). `name` is the label to show; when
// `isMember` the client prefixes it with "u/".
export function buildAuthor(r) {
  const attributed = r.author_name && r.author_name.trim();
  if (attributed) return { name: attributed, isMember: false };
  if (r.username) return { name: r.username, isMember: true };
  return { name: "Spidey Admin", isMember: false };
}
