"use client";

import { s } from "@/lib/style";

// Trailer lightbox with a YouTube embed. Ported from the mockup's trailer modal.
export default function TrailerModal({ onClose, onStopProp }) {
  return (
    <div onClick={onClose} style={s("position: fixed; inset: 0; z-index: 100; background: rgba(4,4,10,0.86); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 40px; animation: bnd-word-rise 320ms cubic-bezier(.2,.7,.2,1) both;")}>
      <div onClick={onStopProp} style={s("position: relative; width: min(1200px, 100%); aspect-ratio: 16/9;")}>
        <div style={s("position: relative; padding: 4px; background: linear-gradient(180deg, #ff1f33 0%, #8b000d 100%); clip-path: polygon(28px 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%, 0 28px); box-shadow: 0 40px 100px rgba(0,0,0,0.6);")}>
          <div style={s("position: relative; background: #000; clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); overflow: hidden; aspect-ratio: 16/9;")}>
            <iframe
              src="https://www.youtube-nocookie.com/embed/62bIsvRcPv0?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1"
              title="Spider-Man: Brand New Day — Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={s("position: absolute; inset: 0; width: 100%; height: 100%; border: 0;")}
            ></iframe>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close trailer" style={s("position: absolute; top: -18px; right: -18px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); color: #fff; font-size: 22px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 22px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.08); font-family: inherit; line-height: 1;")}>×</button>
      </div>
    </div>
  );
}
