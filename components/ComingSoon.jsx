/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { s } from "@/lib/style";

// In-theme placeholder for pages that the source mockup references
// (Signup.dc.html, MJ Wall.dc.html) but did not export. These flows are
// defined in Phase 2; this keeps navigation from ever dead-ending.
export default function ComingSoon({ eyebrow, title, blurb }) {
  return (
    <div style={s("position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(120% 100% at 50% 20%, #14071a 0%, #0a0713 52%, #050308 100%); padding: clamp(24px, 6vw, 64px);")}>
      <img src="/assets/web.png" alt="" style={s("position: absolute; top: -12%; left: -8%; width: min(720px, 60vw); opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />
      <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -18%; right: -10%; width: min(680px, 56vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none;")} />

      <div style={s("position: relative; z-index: 2; width: min(680px, 100%); text-align: center; display: flex; flex-direction: column; align-items: center;")}>
        <img src="/assets/logo.png" alt="Spider-Man: Brand New Day" style={s("width: min(420px, 78vw); height: auto; margin-bottom: clamp(28px, 5vh, 48px); filter: drop-shadow(0 12px 28px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(214,2,26,0.25));")} />

        <div style={s("display: inline-flex; align-items: center; gap: 12px; margin-bottom: 18px;")}>
          <span style={s("width: 40px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
          <span style={s("font-family: 'Oswald', sans-serif; font-size: clamp(10px, 1.2vw, 12px); letter-spacing: 0.42em; text-transform: uppercase; color: #ff6b79;")}>{eyebrow}</span>
          <span style={s("width: 40px; height: 1px; background: linear-gradient(90deg, #ff5a6a, transparent);")}></span>
        </div>

        <h1 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(30px, 6vw, 60px); line-height: 0.98; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 40px rgba(0,0,0,0.7), 0 0 70px rgba(214,2,26,0.22);")}>{title}</h1>

        <p style={s("margin: clamp(16px, 2.6vh, 24px) auto clamp(30px, 5vh, 44px); max-width: 520px; font-size: clamp(13px, 1.5vw, 16px); line-height: 1.6; color: rgba(226,226,240,0.78); text-wrap: pretty;")}>{blurb}</p>

        <Link href="/" data-web-hover="true" className="bnd-cta" style={s("display: inline-block; text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
          <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); box-shadow: 0 14px 36px rgba(214,2,26,0.4);")}>
            <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 10px; padding: 15px 40px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: clamp(13px, 1.4vw, 15px); letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>‹ Back to the Web</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
