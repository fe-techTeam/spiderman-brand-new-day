/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { s } from "@/lib/style";
import SpiderAvatar from "@/components/SpiderAvatar";
import { useForum } from "@/components/forum/ForumProvider";
import { useSession } from "@/components/auth/SessionProvider";
import { relTime } from "@/lib/time";

const NOTIF_LABELS = {
  reply: "replied to your comment",
  "post-comment": "commented on your post",
  mention: "mentioned you",
  "mj-approved": "Your MJ Wall message was approved",
  "mj-rejected": "Your MJ Wall message wasn't approved",
  "fanart-approved": "Your fan art was approved",
  "fanart-rejected": "Your fan art wasn't approved",
  "livefeed-approved": "Your Webshots upload is live",
  "livefeed-rejected": "Your Webshots upload wasn't approved",
};

function NotificationBell() {
  const forum = useForum();
  const [open, setOpen] = useState(false);
  if (!forum) return null;
  const { notifs, unread, markAllRead } = forum;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread) markAllRead();
  };

  return (
    <div style={s("position: relative; flex-shrink: 0;")}>
      <button onClick={toggle} data-web-hover="true" aria-label="Notifications" style={s("position: relative; width: 38px; height: 38px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; cursor: pointer;")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
        {unread > 0 && (
          <span style={s("position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 999px; background: linear-gradient(180deg,#ff3a4a,#c00014); color: #fff; font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; animation: bnd-notif-pulse 1.8s ease-in-out infinite;")}>{unread}</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={s("position: fixed; inset: 0; z-index: 44;")}></div>
          <div className="fm-notif-panel" style={s("position: absolute; top: calc(100% + 10px); right: 0; z-index: 45; width: min(340px, 88vw); background: linear-gradient(160deg, rgba(18,14,22,0.98), rgba(9,8,14,0.99)); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; box-shadow: 0 26px 60px rgba(0,0,0,0.6); overflow: hidden; animation: bnd-menu-drop 220ms cubic-bezier(.2,.7,.2,1) both;")}>
            <div style={s("padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #fff;")}>Notifications</div>
            {notifs.length === 0 ? (
              <div style={s("padding: 22px 16px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.5);")}>You&apos;re all caught up.</div>
            ) : (
              <div style={s("max-height: 60vh; overflow-y: auto;")}>
                {notifs.map((n) => {
                  const label = NOTIF_LABELS[n.kind];
                  const solo = !n.who || n.who === "The Web"; // mj/fanart/system: no actor, label sentence only
                  const headline = solo ? label || n.snippet : label || "sent you a notification";
                  const showSnippet = n.snippet && headline !== n.snippet;
                  return (
                    <Link key={n.id} href={n.href || "/forum"} onClick={() => setOpen(false)} data-web-hover="true" style={s(`display: flex; gap: 11px; padding: 13px 16px; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${n.read ? "transparent" : "rgba(255,40,60,0.07)"};`)}>
                      <span style={s("flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center;")}>
                        <SpiderAvatar size="56%" strokeWidth={4} />
                      </span>
                      <span style={s("min-width: 0; line-height: 1.35;")}>
                        <span style={s("display: block; font-size: 13px; color: rgba(255,255,255,0.9);")}>
                          {solo ? headline : (<><b style={{ fontWeight: 600 }}>{n.who}</b> {headline}</>)}
                        </span>
                        {showSnippet && (
                          <span style={s("display: block; font-size: 12.5px; color: rgba(226,226,240,0.6); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;")}>{n.snippet}</span>
                        )}
                        <span style={s("display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 3px;")}>{relTime(n.time)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserChip({ user, logout }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={s("position: relative; flex-shrink: 0;")}>
      <button onClick={() => setOpen((v) => !v)} data-web-hover="true" aria-label="Account" style={s("display: flex; align-items: center; gap: 9px; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
        <span className="fm-username" style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.85);")}>u/{user.username}</span>
        <span className="fm-avatar" style={s("flex-shrink: 0; width: 38px; height: 38px; border-radius: 11px; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden;")}>
          {user.avatar?.pic ? (
            // identity profile picture (avatars master, admin-managed)
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar.pic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <SpiderAvatar />
          )}
        </span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={s("position: fixed; inset: 0; z-index: 44;")}></div>
          <div style={s("position: absolute; top: calc(100% + 10px); right: 0; z-index: 45; width: 180px; background: linear-gradient(160deg, rgba(18,14,22,0.98), rgba(9,8,14,0.99)); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; box-shadow: 0 26px 60px rgba(0,0,0,0.6); overflow: hidden; animation: bnd-menu-drop 220ms cubic-bezier(.2,.7,.2,1) both;")}>
            <div style={s("padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;")}>u/{user.username}</div>
            <Link href="/" onClick={() => setOpen(false)} data-web-hover="true" style={s("display: flex; align-items: center; gap: 9px; width: 100%; box-sizing: border-box; text-align: left; text-decoration: none; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.85);")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
              Back to Home
            </Link>
            <button onClick={() => { setOpen(false); logout(); }} data-web-hover="true" style={s("display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 13px 16px; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #ff6b79; cursor: pointer;")}>Sign out</button>
          </div>
        </>
      )}
    </div>
  );
}

// Sticky top bar shared by the forum list and the post detail page.
export default function ForumHeader() {
  const { user, loading, openAuth, logout } = useSession();
  return (
    <header className="fm-header" style={s("position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: clamp(12px, 2vw, 24px); padding: 12px clamp(18px, 3vw, 40px); background: rgba(8,7,14,0.82); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(255,255,255,0.08);")}>
      <Link href="/" style={s("display: flex; align-items: center; gap: 12px; text-decoration: none; flex-shrink: 0;")}>
        <img src="/assets/nav-logo.png" alt="Brand New Day" style={s("height: 42px; width: auto; display: block;")} />
      </Link>
      <Link href="/forum" className="fm-header-title" style={s("position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; text-decoration: none;")}>
        <span style={s("font-family: 'Oswald', sans-serif; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase; color: #fff;")}>Spider World</span>
        <span style={s("font-family: 'Oswald', sans-serif; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase; color: #ff2f40;")}>Forum</span>
      </Link>
      <div style={s("margin-left: auto; display: flex; align-items: center; gap: 12px; flex-shrink: 0;")}>
        <Link href="/" className="fm-exit" data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; background: rgba(255,255,255,0.04); text-decoration: none; color: rgba(255,255,255,0.75); font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; transition: border-color .2s ease, color .2s ease;")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
          <span className="fm-exit-label">Home</span>
        </Link>
        {loading ? null : user ? (
          <>
            <NotificationBell />
            <UserChip user={user} logout={logout} />
          </>
        ) : (
          <button onClick={() => openAuth("login")} data-web-hover="true" style={s("border: 0; padding: 10px 22px; background: linear-gradient(180deg, #ff1f33 0%, #c00014 100%); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; border-radius: 999px; cursor: pointer; text-shadow: 0 1px 0 rgba(0,0,0,0.35);")}>Swing In</button>
        )}
      </div>
    </header>
  );
}
