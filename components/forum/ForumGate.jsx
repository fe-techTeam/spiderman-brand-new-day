"use client";

import { s } from "@/lib/style";

// Members-only gate for /forum routes. Shared links land here logged-out —
// one big onboarding CTA opens the auth popup; the page unlocks in place
// after the session refreshes (no navigation, deep links keep working).
export default function ForumGate({ onJoin, onLogin }) {
  return (
    <div style={s("position: relative; z-index: 2; min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center; padding: clamp(28px, 6vh, 64px) clamp(18px, 5vw, 40px);")}>
      <div style={s("position: relative; width: min(520px, 100%); padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3); animation: fm-rise .5s cubic-bezier(.16,.84,.3,1) both;")}>
        <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(32px, 6vw, 46px) clamp(24px, 5vw, 40px); text-align: center; overflow: hidden;")}>
          <img src="/assets/web.png" alt="" style={s("position: absolute; top: -50px; right: -60px; width: 240px; opacity: 0.07; mix-blend-mode: screen; pointer-events: none;")} />

          {/* spider emblem */}
          <div style={s("position: relative; width: 74px; height: 74px; margin: 0 auto 18px; border-radius: 50%; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.45); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 22px rgba(0,0,0,0.6), 0 0 26px rgba(255,40,60,0.25);")}>
            <span style={s("position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(255,60,74,0.35); animation: bnd-radar-ring 2.8s ease-out infinite;")}></span>
            <svg viewBox="0 0 100 100" style={{ width: "56%", height: "56%" }} fill="none" stroke="#ff3a4a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="50" cy="44" rx="9" ry="12" /><path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" /></svg>
          </div>

          <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 10px;")}>
            <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>Members Only</span>
            <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, #ff5a6a, transparent);")}></span>
          </div>

          <h1 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(26px, 5.6vw, 36px); line-height: 1.04; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6); text-wrap: balance;")}>The Spider-Verse Forum <span style={{ color: "#ff2f40" }}>is behind the mask.</span></h1>
          <p style={s("margin: 14px auto 26px; max-width: 380px; font-size: clamp(13px, 1.5vw, 15px); line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>Get onboarded to step inside — claim your Spider identity and join a Web of real people, real identities, real stories.</p>

          <button onClick={onJoin} data-web-hover="true" className="bnd-cta" style={s("width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
              <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 16px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Get Onboarded</span>
            </span>
          </button>

          <p style={s("margin: 18px 0 0; font-size: 13px; color: rgba(226,226,240,0.6);")}>
            Already swinging with us?{" "}
            <button onClick={onLogin} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font: inherit; padding: 0;")}>Log in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
