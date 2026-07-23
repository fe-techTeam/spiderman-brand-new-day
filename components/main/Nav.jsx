/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { TICKETS_URL } from "@/lib/tickets";
import { useSession } from "@/components/auth/SessionProvider";

// Fixed top navigation + mobile dropdown menu. Ported from the hero's <nav>.
// Logged-in users see a "u/username" chip that opens a small account popup
// (Forum + Sign out) instead of the SWING IN CTA.
export default function Nav({
  mobileMenuVisible,
  navItems,
  onGoHome,
  onGetStarted,
  onToggleMobileMenu,
  onMobileSwingIn,
}) {
  const router = useRouter();
  const { user, logout } = useSession();
  const goAccount = () => router.push(user && user.needsQuiz ? "/quiz" : "/forum");

  // account popup anchored to the username chip
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => { if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setMenuOpen(false); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <nav className="bnd-nav" style={s("position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: clamp(14px, 2vh, 22px) clamp(24px, 4vw, 60px); display: flex; align-items: center; justify-content: space-between; gap: clamp(12px, 2vw, 24px); opacity: 1; background: linear-gradient(to bottom, rgba(8,8,12,0.55) 0%, rgba(8,8,12,0) 100%);")}>
        <a href="#" onClick={(e) => { e.preventDefault(); onGoHome(); }} style={s("display: block; line-height: 0; flex-shrink: 0;")}>
          <img src="/assets/nav-logo.png" alt="Spider-Man: Brand New Day" style={s("height: clamp(44px, 4.4vw, 64px); width: auto; display: block; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));")} />
        </a>

        {/* DESKTOP: menu + SWING IN. Both nav variants are always in the DOM and
            CSS picks one by breakpoint (.bnd-nav-desktop / .bnd-nav-burger in
            globals.css) — gating them on the isDesktop STATE meant the server
            HTML (which defaults to desktop) showed the full-width menu on phones
            until hydration measured the window, then snapped into a hamburger. */}
        <div className="bnd-nav-desktop" style={s("display: flex; align-items: center; gap: clamp(14px, 2.2vw, 30px);")}>
            <ul style={s("list-style: none; margin: 0; padding: 0; display: flex; gap: clamp(12px, 1.7vw, 20px); align-items: center;")}>
              {navItems.map((item) => (
                <li key={item.label} style={s("position: relative; display: flex; align-items: center; gap: 6px;")}>
                  <a
                    href={item.href || "#"}
                    target={item.href ? "_blank" : undefined}
                    rel={item.href ? "noopener noreferrer" : undefined}
                    onClick={item.onClick}
                    title={item.title}
                    className="nav-link"
                    style={s(`color: ${item.color}; text-decoration: none; font-size: 11.5px; font-weight: 400; letter-spacing: 0.18em; text-transform: uppercase; padding: 8px 4px; display: inline-flex; align-items: center; gap: 6px; cursor: ${item.cursor}; transition: color 200ms ease, text-shadow 200ms ease; text-shadow: ${item.active ? "0 0 18px rgba(214,2,26,0.7)" : "none"};`)}
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
            {user ? (
              <div ref={menuWrapRef} style={s("position: relative;")}>
                {/* compact account pill — the full beveled CTA read too heavy next
                    to a nav row this dense (user feedback) */}
                <button onClick={() => setMenuOpen((v) => !v)} aria-haspopup="true" aria-expanded={menuOpen} style={s(`display: inline-flex; align-items: center; gap: 8px; border: 1px solid ${menuOpen ? "rgba(255,60,74,0.55)" : "rgba(255,255,255,0.16)"}; padding: 4px 11px 4px 4px; border-radius: 999px; background: rgba(10,10,18,0.55); cursor: pointer; font-family: inherit; transition: border-color 200ms ease;`)}>
                  <span aria-hidden="true" style={s("width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); box-shadow: 0 0 12px rgba(255,40,60,0.4); display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 600; text-transform: uppercase;")}>{user.username.charAt(0)}</span>
                  <span style={s("color: rgba(255,255,255,0.92); font-size: 12px; font-weight: 500; letter-spacing: 0.06em;")}>{"u/" + user.username}</span>
                  <span aria-hidden="true" style={s(`color: rgba(255,255,255,0.55); font-size: 9px; letter-spacing: 0; transform: rotate(${menuOpen ? "180deg" : "0deg"}); transition: transform 200ms ease;`)}>▾</span>
                </button>

                {/* account popup */}
                {menuOpen && (
                  <div style={s("position: absolute; top: calc(100% + 10px); right: 0; z-index: 60; min-width: 200px; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.35), rgba(255,40,60,0.4)); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); box-shadow: 0 22px 60px rgba(0,0,0,0.6); animation: bnd-menu-drop 220ms cubic-bezier(.2,.7,.2,1) both;")}>
                    {/* items run one tier tighter than the rest of the site's menus —
                        this popup now stacks up to 4 actions */}
                    <div style={s("background: linear-gradient(160deg, rgba(13,18,36,0.98), rgba(8,10,20,0.99)); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px); padding: 8px;")}>
                      <div style={s("padding: 6px 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 6px;")}>
                        <div style={s("font-family: 'Oswald', sans-serif; font-size: 12.5px; color: #fff; letter-spacing: 0.04em;")}>{"u/" + user.username}</div>
                        <div style={s("margin-top: 1px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.4);")}>Signed in</div>
                      </div>
                      <button onClick={() => { setMenuOpen(false); goAccount(); }} data-web-hover="true" style={s("width: 100%; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; cursor: pointer; padding: 8px 10px; border-radius: 8px; color: rgba(255,255,255,0.85); font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; text-align: left; transition: background .2s ease;")} className="bnd-pop-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
                        {user.needsQuiz ? "Finish Onboarding" : "Forum"}
                      </button>
                      {!user.needsQuiz && (
                        <button onClick={() => { setMenuOpen(false); router.push("/quiz?retake=1"); }} data-web-hover="true" style={s("width: 100%; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; cursor: pointer; padding: 8px 10px; border-radius: 8px; color: rgba(255,255,255,0.85); font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; text-align: left; transition: background .2s ease;")} className="bnd-pop-item">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-2.6-6.4" /><path d="M21 3v6h-6" /></svg>
                          Retake Identity Quiz
                        </button>
                      )}
                      <a href={TICKETS_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} data-web-hover="true" style={s("width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 8px; text-decoration: none; padding: 8px 10px; border-radius: 8px; color: rgba(255,255,255,0.85); font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; transition: background .2s ease;")} className="bnd-pop-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2z" /><path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" /></svg>
                        Book Tickets <span aria-hidden="true" style={s("margin-left: auto; font-size: 12px; line-height: 1; letter-spacing: 0; color: rgba(255,255,255,0.5);")}>↗</span>
                      </a>
                      <button onClick={() => { setMenuOpen(false); logout(); }} data-web-hover="true" style={s("width: 100%; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; cursor: pointer; padding: 8px 10px; border-radius: 8px; color: #ff8a95; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; text-align: left; transition: background .2s ease;")} className="bnd-pop-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // one tier smaller than the section CTAs — sized to the compact nav row
              <button onClick={onGetStarted} style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
                <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #1f4cd6 0%, #0b2a8a 100%); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px); box-shadow: 0 4px 16px rgba(31,76,214,0.4), 0 0 0 1px rgba(255,255,255,0.05);")}>
                  <span style={s("display: block; padding: 9px 19px; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); color: #fff; font-weight: 700; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(0,0,0,0.35);")}>SWING IN</span>
                </span>
              </button>
            )}
          </div>

        {/* MOBILE: hamburger — morphs into an X while the menu is open */}
        <button className="bnd-nav-burger" onClick={onToggleMobileMenu} aria-label={mobileMenuVisible ? "Close menu" : "Menu"} aria-expanded={mobileMenuVisible} style={s("border: 0; background: rgba(8,8,12,0.4); width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 0 1px rgba(255,255,255,0.08);")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              {/* lines sit 5 units apart; with fill-box origins the outer pair
                  translates onto the middle line and rotates into an X */}
              <path d="M4 7h16" style={{ transformBox: "fill-box", transformOrigin: "center", transition: "transform 260ms cubic-bezier(.2,.7,.2,1)", transform: mobileMenuVisible ? "translateY(5px) rotate(45deg)" : "none" }} />
              <path d="M4 12h16" style={{ transformBox: "fill-box", transformOrigin: "center", transition: "transform 200ms ease, opacity 160ms ease", opacity: mobileMenuVisible ? 0 : 1, transform: mobileMenuVisible ? "scaleX(0.3)" : "none" }} />
              <path d="M4 17h16" style={{ transformBox: "fill-box", transformOrigin: "center", transition: "transform 260ms cubic-bezier(.2,.7,.2,1)", transform: mobileMenuVisible ? "translateY(-5px) rotate(-45deg)" : "none" }} />
            </svg>
          </button>
      </nav>

      {/* MOBILE MENU BACKDROP — dims + blurs the page behind the menu so its
          items read clearly; sits under the nav (z 50) so the logo and the
          hamburger-X stay crisp and tappable. Tapping it closes the menu. */}
      {mobileMenuVisible && (
        <div onClick={onToggleMobileMenu} style={s("position: fixed; inset: 0; z-index: 45; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: bnd-overlay-fade 240ms ease both;")}></div>
      )}

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuVisible && (
        <div style={s("position: fixed; top: calc(clamp(66px, 9vh, 86px) + 15px); left: 12px; right: 12px; z-index: 55; border-radius: 16px; background: linear-gradient(160deg, #14204d 0%, #0b1440 58%, #2a0710 100%); box-shadow: 0 26px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1) inset; padding: 10px 12px 14px; animation: bnd-menu-drop 260ms cubic-bezier(.2,.7,.2,1) both;")}>
          {navItems.filter((item) => !item.mobileHidden).map((item) => (
            <a
              key={item.label}
              href={item.href || "#"}
              target={item.href ? "_blank" : undefined}
              rel={item.href ? "noopener noreferrer" : undefined}
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
          {user ? (
            <>
              <button onClick={goAccount} style={s("width: 100%; margin-top: 14px; border: 0; padding: 16px; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); color: #fff; font-weight: 700; font-size: 15px; letter-spacing: 0.24em; text-transform: none; border-radius: 10px; cursor: pointer; font-family: inherit;")}>{"u/" + user.username}</button>
              {!user.needsQuiz && (
                <button onClick={() => router.push("/quiz?retake=1")} style={s("width: 100%; margin-top: 10px; border: 1px solid rgba(255,255,255,0.16); padding: 12px; background: transparent; color: rgba(255,255,255,0.8); font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; border-radius: 10px; cursor: pointer; font-family: inherit;")}>Retake Identity Quiz</button>
              )}
              <button onClick={logout} style={s("width: 100%; margin-top: 10px; border: 0; padding: 12px; background: transparent; color: rgba(255,255,255,0.65); font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; border-radius: 10px; cursor: pointer; font-family: inherit;")}>Sign out</button>
            </>
          ) : (
            <button onClick={onMobileSwingIn} style={s("width: 100%; margin-top: 14px; border: 0; padding: 16px; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); color: #fff; font-weight: 700; font-size: 15px; letter-spacing: 0.24em; text-transform: uppercase; border-radius: 10px; cursor: pointer; font-family: inherit;")}>SWING IN</button>
          )}
        </div>
      )}
    </>
  );
}
