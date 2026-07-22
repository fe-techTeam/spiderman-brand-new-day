"use client";

import { useEffect } from "react";
import { s } from "@/lib/style";

// Trailer lightbox with a YouTube embed. Ported from the mockup's trailer modal.
// videoId is per-opener so callers can swap which trailer plays; it defaults to
// the site's main trailer.
const DEFAULT_VIDEO_ID = "62bIsvRcPv0";
export default function TrailerModal({ onClose, onStopProp, videoId = DEFAULT_VIDEO_ID }) {
  // Announce the trailer's lifecycle on window so the MusicPlayer (mounted in a
  // separate tree, the root layout) can duck the score while the trailer runs.
  // Hooking mount/unmount here covers every opener — hero card, footer link,
  // nav and walkthrough actions — without wiring each call site.
  useEffect(() => {
    window.dispatchEvent(new Event("bnd:trailer-open"));
    return () => window.dispatchEvent(new Event("bnd:trailer-close"));
  }, []);

  return (
    <div onClick={onClose} className="bnd-trailer-ovl" style={s("position: fixed; inset: 0; z-index: 100; background: rgba(4,4,10,0.86); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 40px; animation: bnd-word-rise 320ms cubic-bezier(.2,.7,.2,1) both;")}>
      <div onClick={onStopProp} className="bnd-trailer-box" style={s("position: relative; width: min(1200px, 100%); aspect-ratio: 16/9;")}>
        <div className="bnd-trailer-chrome" style={s("position: relative; padding: 4px; background: linear-gradient(180deg, #ff1f33 0%, #8b000d 100%); clip-path: polygon(28px 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%, 0 28px); box-shadow: 0 40px 100px rgba(0,0,0,0.6);")}>
          <div className="bnd-trailer-video" style={s("position: relative; background: #000; clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); overflow: hidden; aspect-ratio: 16/9;")}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`}
              title="Spider-Man: Brand New Day — Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={s("position: absolute; inset: 0; width: 100%; height: 100%; border: 0;")}
            ></iframe>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close trailer" className="bnd-trailer-close" style={s("position: absolute; top: -18px; right: -18px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); color: #fff; font-size: 22px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 22px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.08); font-family: inherit; line-height: 1;")}>×</button>
      </div>
    </div>
  );
}
