"use client";

import { useEffect } from "react";

// Subtle click feedback at the cursor: every mouse press pops a small red
// ring (.bnd-click-ping) at the pointer. DOM-managed directly — no re-renders.
// Touch devices are skipped; they have their own tap feedback and no cursor.
export default function CursorFx() {
  useEffect(() => {
    const onDown = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const el = document.createElement("span");
      el.className = "bnd-click-ping";
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 700); // safety net if the animation never fires
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
