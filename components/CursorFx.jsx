"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CLICKABLE = "a, button:not(:disabled), select, summary, [role=\"button\"], [data-web-hover]";

// Cursor feedback layer (mouse pointers only):
// 1. Hovering anything clickable fades in a red spidey overlay exactly over
//    the pointer while the native white cursor hides (html.bnd-fx-cursor CSS)
//    — a native cursor image swap can't animate, this can.
// 2. Every press pops a red ping ring (.bnd-click-ping) at the pointer.
// All DOM-managed directly — no React re-renders on pointer move.
// The admin panel keeps standard cursors — no overlay, no ping.
export default function CursorFx() {
  const pathname = usePathname();
  const isAdmin = pathname ? pathname.startsWith("/admin") : false;
  useEffect(() => {
    if (isAdmin) return;
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

    // warm both cursor images so the first hover swap can't flash the native
    // fallback while the SVG is still being fetched/decoded
    for (const src of ["/assets/cursor-spider.svg", "/assets/cursor-spider-red.svg"]) {
      const img = new Image();
      img.src = src;
    }

    const wrap = document.createElement("div");
    wrap.className = "bnd-cursor-fx";
    wrap.setAttribute("aria-hidden", "true");
    const red = document.createElement("div");
    red.className = "bnd-cursor-red";
    wrap.appendChild(red);
    document.body.appendChild(wrap);
    document.documentElement.classList.add("bnd-fx-cursor");

    let on = false;
    const setOn = (next) => {
      if (next === on) return;
      on = next;
      wrap.classList.toggle("on", on);
    };

    const onMove = (e) => {
      wrap.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      const t = e.target;
      // iframes (trailer embed) swallow pointer events — drop the overlay there
      setOn(!!(t && t.closest && t.closest(CLICKABLE)) && t.tagName !== "IFRAME");
    };
    const onLeave = () => setOn(false);

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

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("bnd-fx-cursor");
      wrap.remove();
    };
  }, [isAdmin]);
  return null;
}
