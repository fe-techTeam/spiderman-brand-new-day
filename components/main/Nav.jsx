/* eslint-disable @next/next/no-img-element */
"use client";

import { s } from "@/lib/style";

// Fixed top navigation + mobile dropdown menu. Ported from the hero's <nav>.
export default function Nav({
  isDesktop,
  mobileMenuVisible,
  navItems,
  onGoHome,
  onGetStarted,
  onToggleMobileMenu,
  onMobileSwingIn,
}) {
  return (
    <>
      <nav style={s("position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: clamp(14px, 2vh, 22px) clamp(24px, 4vw, 60px); display: flex; align-items: center; justify-content: space-between; gap: clamp(12px, 2vw, 24px); opacity: 1; background: linear-gradient(to bottom, rgba(8,8,12,0.55) 0%, rgba(8,8,12,0) 100%);")}>
        <a href="#" onClick={(e) => { e.preventDefault(); onGoHome(); }} style={s("display: block; line-height: 0; flex-shrink: 0;")}>
          <img src="/assets/nav-logo.png" alt="Spider-Man: Brand New Day" style={s("height: clamp(44px, 4.4vw, 64px); width: auto; display: block; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));")} />
        </a>

        {/* DESKTOP: menu + SWING IN */}
        {isDesktop && (
          <div style={s("display: flex; align-items: center; gap: clamp(20px, 3vw, 44px);")}>
            <ul style={s("list-style: none; margin: 0; padding: 0; display: flex; gap: clamp(16px, 2.2vw, 28px); align-items: center;")}>
              {navItems.map((item) => (
                <li key={item.label} style={s("position: relative; display: flex; align-items: center; gap: 6px;")}>
                  <a
                    href="#"
                    onClick={item.onClick}
                    title={item.title}
                    className="nav-link"
                    style={s(`color: ${item.color}; text-decoration: none; font-size: 13px; font-weight: 400; letter-spacing: 0.22em; text-transform: uppercase; padding: 8px 4px; display: inline-flex; align-items: center; gap: 6px; cursor: ${item.cursor}; transition: color 200ms ease, text-shadow 200ms ease; text-shadow: ${item.active ? "0 0 18px rgba(214,2,26,0.7)" : "none"};`)}
                  >
                    <span>{item.label}</span>
                    {item.locked && (
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ opacity: 0.7 }}>
                        <path d="M2 5V3.5a3 3 0 016 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <rect x="1" y="5" width="8" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    )}
                  </a>
                  {item.active && (
                    <span style={s("position: absolute; left: 4px; right: 4px; bottom: -3px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, #ff2f40, transparent); box-shadow: 0 0 10px rgba(255,47,64,0.8);")}></span>
                  )}
                </li>
              ))}
            </ul>
            <button onClick={onGetStarted} style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
              <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #1f4cd6 0%, #0b2a8a 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 6px 22px rgba(31,76,214,0.45), 0 0 0 1px rgba(255,255,255,0.05);")}>
                <span style={s("display: block; padding: 14px 28px; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-weight: 700; font-size: 14px; letter-spacing: 0.22em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(0,0,0,0.35);")}>SWING IN</span>
              </span>
            </button>
          </div>
        )}

        {/* MOBILE: hamburger */}
        {!isDesktop && (
          <button onClick={onToggleMobileMenu} aria-label="Menu" style={s("border: 0; background: rgba(8,8,12,0.4); width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 0 1px rgba(255,255,255,0.08);")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        )}
      </nav>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuVisible && (
        <div style={s("position: fixed; top: clamp(66px, 9vh, 86px); left: 12px; right: 12px; z-index: 55; border-radius: 16px; background: linear-gradient(160deg, #14204d 0%, #0b1440 58%, #2a0710 100%); box-shadow: 0 26px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1) inset; padding: 10px 12px 14px; animation: bnd-menu-drop 260ms cubic-bezier(.2,.7,.2,1) both;")}>
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              onClick={item.onMobileClick}
              data-web-hover="true"
              style={s(`display: flex; align-items: center; justify-content: space-between; padding: 16px 12px; color: ${item.color}; text-decoration: none; font-size: 15px; letter-spacing: 0.18em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.08); border-radius: 8px; background: ${item.active ? "rgba(255,40,60,0.12)" : "transparent"};`)}
            >
              <span>{item.label}</span>
              {item.locked && (
                <svg width="11" height="13" viewBox="0 0 10 12" fill="none" style={{ opacity: 0.7 }}>
                  <path d="M2 5V3.5a3 3 0 016 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <rect x="1" y="5" width="8" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              )}
            </a>
          ))}
          <button onClick={onMobileSwingIn} style={s("width: 100%; margin-top: 14px; border: 0; padding: 16px; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); color: #fff; font-weight: 700; font-size: 15px; letter-spacing: 0.24em; text-transform: uppercase; border-radius: 10px; cursor: pointer; font-family: inherit;")}>SWING IN</button>
        </div>
      )}
    </>
  );
}
