/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */
"use client";

import { s } from "@/lib/style";

// Shown when the forum has no posts (e.g. once the real backend is connected and
// returns an empty list). Phase 1 ships with mock threads, so this is the
// ready-to-use empty state.
export default function EmptyState({ onCreate }) {
  return (
    <div style={s("position: relative; overflow: hidden; text-align: center; padding: clamp(44px, 8vw, 72px) clamp(20px, 5vw, 40px); background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.14); border-radius: 16px;")}>
      <img src="/assets/web.png" alt="" style={s("position: absolute; top: -30%; left: 50%; transform: translateX(-50%); width: min(420px, 90%); opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />
      <div style={s("position: relative; display: inline-flex; align-items: center; justify-content: center; width: 74px; height: 74px; border-radius: 18px; margin-bottom: 20px; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); box-shadow: 0 0 40px rgba(214,2,26,0.25);")}>
        <svg viewBox="0 0 100 100" style={{ width: "52%", height: "52%" }} fill="none" stroke="#ff5a6a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="50" cy="44" rx="9" ry="12" />
          <path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" />
        </svg>
      </div>
      <h3 style={s("position: relative; font-family: 'Oswald', sans-serif; font-size: clamp(20px, 4vw, 26px); color: #fff; margin-bottom: 10px;")}>No stories on the Web yet</h3>
      <p style={s("position: relative; margin: 0 auto 26px; max-width: 420px; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.65);")}>The Web is quiet for now. Be the first to swing in and share your story with the Spider World.</p>
      <button onClick={onCreate} data-web-hover="true" className="fm-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
        <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);")}>
          <span style={s("position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 9px; padding: 13px 30px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase;")}><span className="fm-sheen"></span><span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> Create the first post</span>
        </span>
      </button>
    </div>
  );
}
