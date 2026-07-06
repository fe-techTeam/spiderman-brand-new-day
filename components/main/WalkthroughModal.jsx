/* eslint-disable @next/next/no-img-element */
"use client";

import { s } from "@/lib/style";

// The Walkthrough — PS5-HUD-style welcome modal that auto-opens after the
// hero's cinematic entrance. Ported from the mockup's walkthrough block.
export default function WalkthroughModal({ walk, items, onClose, onJoin, onHover }) {
  return (
    <div style={s(`position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: clamp(14px, 3vh, 32px); background: rgba(4,6,14,${walk.scrim}); backdrop-filter: blur(${walk.blur}); transition: background 500ms ease, backdrop-filter 500ms ease; pointer-events: ${walk.pe};`)}>
      <div style={s(`position: relative; width: min(1000px, 100%); max-height: 94vh; transform-style: preserve-3d; opacity: ${walk.opacity}; transform: ${walk.transform}; filter: ${walk.filter}; transition: opacity 900ms ease, transform 1400ms cubic-bezier(.16,.9,.28,1), filter 1100ms ease;`)}>
        {/* HUD PANEL */}
        <div style={s("position: relative; padding: 1px; background: linear-gradient(135deg, rgba(120,150,220,0.35) 0%, rgba(255,40,60,0.5) 50%, rgba(120,150,220,0.2) 100%); clip-path: polygon(28px 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%, 0 28px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3);")}>
          <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.97) 0%, rgba(6,9,20,0.98) 55%, rgba(9,17,36,0.97) 100%); clip-path: polygon(27px 0, 100% 0, 100% calc(100% - 27px), calc(100% - 27px) 100%, 0 100%, 0 27px); overflow: hidden;")}>
            {/* web texture */}
            <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -60px; right: -50px; width: 320px; opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />

            {/* HEADER */}
            <div style={s("position: relative; padding: clamp(34px, 5vh, 54px) clamp(24px, 3vw, 44px) 0; display: flex; flex-direction: column; align-items: center; text-align: center;")}>
              <h2 style={s("margin: 0; font-size: clamp(20px, 2.9vw, 34px); line-height: 1.05; font-weight: 800; letter-spacing: 0.01em; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.5); text-wrap: balance;")}>Every Brand New Day starts with <span style={{ color: "#ff3a4a" }}>someone like you</span></h2>
              <p style={s("margin: 14px auto 0; max-width: 740px; font-size: clamp(13px, 1.4vw, 15px); line-height: 1.55; color: rgba(210,222,255,0.82); text-wrap: pretty;")}>You don&apos;t need radioactive blood to be Spider-Man. You just need to show up: for someone, for something, for yourself. Choose your identity, claim your identity, and become part of the biggest web this world has ever seen.</p>
              <div style={s("margin-top: clamp(16px, 2.4vh, 24px); width: min(320px, 70%); height: 2px; background: linear-gradient(90deg, rgba(120,150,220,0.15) 0%, rgba(120,150,220,0.35) 30%, #ff2233 50%, rgba(120,150,220,0.35) 70%, rgba(120,150,220,0.15) 100%);")}></div>
            </div>

            {/* close */}
            <button onClick={onClose} aria-label="Close" style={s("position: absolute; top: 14px; right: 16px; z-index: 5; width: 34px; height: 34px; border: 0; background: transparent; color: rgba(255,255,255,0.6); font-size: 22px; font-weight: 400; cursor: pointer; line-height: 1;")}>×</button>

            {/* BODY */}
            <div style={s("position: relative; padding: clamp(20px, 3vh, 30px) clamp(24px, 3vw, 40px) clamp(34px, 5vh, 52px);")}>
              <div style={s("display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(9px, 1.1vw, 14px);")}>
                {items.map((w, i) => (
                  <div
                    key={i}
                    data-web-hover="true"
                    onMouseEnter={onHover}
                    className="bnd-card walk-card"
                    style={s(`position: relative; padding: 1px; background: linear-gradient(140deg, rgba(120,150,220,0.3), rgba(255,40,60,0.28)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); animation: bnd-walk-item 820ms cubic-bezier(.16,.84,.3,1) both; animation-delay: ${w.delay}; transition: transform 420ms cubic-bezier(.16,.84,.3,1), box-shadow 420ms ease, background 420ms ease; transform-style: preserve-3d;`)}
                  >
                    <span className="bnd-card-sheen" style={s("position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
                      <span style={s("position: absolute; top: -40%; left: -60%; width: 40%; height: 180%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent); transform: skewX(-18deg);")}></span>
                    </span>
                    <div className="bnd-card-body" style={s("position: relative; height: 100%; box-sizing: border-box; padding: clamp(14px, 1.8vh, 18px) clamp(14px, 1.5vw, 18px); background: linear-gradient(160deg, rgba(18,26,48,0.95), rgba(9,14,28,0.95)); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); transition: background 420ms ease;")}>
                      <div style={s("display: flex; align-items: center; gap: 11px; margin-bottom: 12px;")}>
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="#ff2233" style={{ flexShrink: 0, filter: "drop-shadow(0 0 5px rgba(255,40,60,0.6))" }}><path d="M0 0l10 6-10 6z" /></svg>
                        <span className="bnd-card-emoji" style={s("font-size: clamp(24px, 2.8vw, 30px); line-height: 1; display: inline-block; flex-shrink: 0; transition: transform 420ms cubic-bezier(.2,1.4,.4,1);")}>{w.emoji}</span>
                        <div style={s("min-width: 0;")}>
                          <div style={s("font-family: 'Oswald', 'Acumin Pro', sans-serif; font-size: clamp(14px, 1.55vw, 16.5px); font-weight: 500; letter-spacing: 0.03em; text-transform: uppercase; color: #fff; line-height: 1.08;")}>{w.line1}<br />{w.line2}</div>
                          <div style={s("margin-top: 6px; width: 70px; height: 2px; background: linear-gradient(90deg, #ff2233 0%, #ff2233 42%, rgba(120,150,220,0.35) 62%, rgba(120,150,220,0.12) 100%);")}></div>
                        </div>
                      </div>
                      <div style={s("font-size: clamp(11px, 1.2vw, 12.5px); line-height: 1.4; color: rgba(190,205,240,0.7);")}>{w.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* bottom CTA */}
              <div style={s("margin-top: clamp(16px, 2.4vh, 26px); display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; padding-top: clamp(16px, 2.4vh, 24px); border-top: 1px solid rgba(120,150,220,0.15);")}>
                <button onClick={onJoin} onMouseEnter={onHover} data-web-hover="true" className="bnd-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit; flex-shrink: 0;")}>
                  <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
                    <span className="bnd-cta-inner" style={s("display: block; padding: 15px 34px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-weight: 700; font-size: clamp(13px, 1.4vw, 15px); letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 1px 3px rgba(0,0,0,0.4);")}><span className="bnd-cta-sheen"></span>Join the Spider-Verse</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
