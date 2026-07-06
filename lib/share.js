// Share a forum post: the link + the title + the first line of the description
// (no image). Uses the Web Share API when available (mobile), else copies to the
// clipboard. Returns "shared" | "copied" | "aborted" | "failed".

export function firstLine(text) {
  if (!text) return "";
  const m = String(text).match(/^\s*[^.!?\n]*[.!?]/);
  return (m ? m[0] : String(text).split("\n")[0]).trim();
}

export async function sharePost(thread) {
  if (!thread || typeof window === "undefined") return "failed";
  const url = `${window.location.origin}/forum/${thread.id}`;
  const text = `${thread.title}\n${firstLine(thread.body)}`;
  const data = { title: thread.title, text, url };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "aborted";
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch (e) {
    return "failed";
  }
}
