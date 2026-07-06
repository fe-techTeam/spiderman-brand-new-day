"use client";

import { useState } from "react";
import { s } from "@/lib/style";
import { sharePost } from "@/lib/share";

// Shares a post: link + title + first line of the description (no image). Native
// share sheet where available, else copies to clipboard with a transient label.
export default function ShareButton({ thread, stop }) {
  const [label, setLabel] = useState("Share");
  const onClick = async (e) => {
    if (stop) e.stopPropagation();
    const r = await sharePost(thread);
    if (r === "copied") { setLabel("Link copied!"); setTimeout(() => setLabel("Share"), 1800); }
    else if (r === "shared") { setLabel("Shared!"); setTimeout(() => setLabel("Share"), 1800); }
  };
  return (
    <button onClick={onClick} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,0.05); border: 0; font-size: 12px; color: rgba(255,255,255,0.7); cursor: pointer; font-family: inherit;")}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" /></svg>{label}
    </button>
  );
}
