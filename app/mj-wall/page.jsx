/* eslint-disable @next/next/no-img-element */
"use client";

// The MJ Wall — public gallery of approved messages (Phase 2, wired to the
// real API). Logged-in users also see a slim strip of their own submissions
// with moderation status. Writing happens on the home page's MJ Wall section.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { s } from "@/lib/style";
import { useSession } from "@/components/auth/SessionProvider";
import { portalApi } from "@/lib/portal/api";
import { relTime } from "@/lib/time";

const STATUS = {
  pending: { label: "Pending", color: "#ffd23f", bg: "rgba(255,210,63,0.12)", border: "rgba(255,210,63,0.35)" },
  approved: { label: "Approved", color: "#7ee787", bg: "rgba(126,231,135,0.12)", border: "rgba(126,231,135,0.35)" },
  rejected: { label: "Rejected", color: "#ff5a6a", bg: "rgba(255,90,106,0.12)", border: "rgba(255,90,106,0.35)" },
  hidden: { label: "Hidden", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.2)" },
};

function StatusChip({ status }) {
  const def = STATUS[status] || STATUS.hidden;
  return (
    <span style={s(`display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; background: ${def.bg}; border: 1px solid ${def.border}; color: ${def.color}; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; white-space: nowrap;`)}>
      {def.label}
    </span>
  );
}

export default function MjWallPage() {
  const { user } = useSession();
  const [wall, setWall] = useState({ messages: [], nextCursor: null });
  const [state, setState] = useState("loading"); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [mine, setMine] = useState(null);

  const loadWall = useCallback(async () => {
    setState("loading");
    try {
      const data = await portalApi("/mj-wall/messages?limit=12");
      setWall({ messages: data.messages, nextCursor: data.nextCursor });
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    loadWall();
  }, [loadWall]);

  useEffect(() => {
    if (!user) {
      setMine(null);
      return;
    }
    let on = true;
    portalApi("/me/mj-messages")
      .then((data) => {
        if (on) setMine(data.messages);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [user]);

  const loadMore = async () => {
    if (!wall.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await portalApi(`/mj-wall/messages?limit=12&cursor=${encodeURIComponent(wall.nextCursor)}`);
      setWall((w) => ({ messages: [...w.messages, ...data.messages], nextCursor: data.nextCursor }));
    } catch {
      // keep current page; the button stays available to retry
    }
    setLoadingMore(false);
  };

  return (
    <div style={s("position: relative; min-height: 100vh; overflow: hidden; background: radial-gradient(130% 90% at 80% -10%, #131a2e 0%, #090d18 45%, #06080f 100%); padding: clamp(24px, 4vh, 44px) clamp(18px, 4vw, 48px) 96px;")}>
      <img src="/assets/web.png" alt="" style={s("position: absolute; top: -12%; left: -8%; width: min(720px, 60vw); opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />
      <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -18%; right: -10%; width: min(680px, 56vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none;")} />

      <div style={s("position: relative; z-index: 2; max-width: 1080px; margin: 0 auto;")}>
        {/* back link */}
        <div style={s("margin-bottom: clamp(28px, 5vh, 44px);")}>
          <Link href="/" data-web-hover="true" className="bnd-cta" style={s("display: inline-block; text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
            <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
              <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 10px; padding: 13px 28px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>‹ Back to the Web</span>
            </span>
          </Link>
        </div>

        {/* header */}
        <header style={s("margin-bottom: clamp(28px, 5vh, 42px);")}>
          <div style={s("display: inline-flex; align-items: center; gap: 12px; margin-bottom: 14px;")}>
            <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff1f33, transparent);")}></span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.36em; text-transform: uppercase; color: #ff5a6a;")}>The Wall</span>
          </div>
          <h1 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(30px, 5vw, 54px); line-height: 0.98; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 40px rgba(0,0,0,0.7), 0 0 70px rgba(214,2,26,0.22);")}>Messages for MJ</h1>
          <p style={s("margin: 14px 0 0; max-width: 560px; font-size: clamp(13px, 1.5vw, 16px); line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>Every memory of Peter the Web has left for her — one card at a time.</p>
        </header>

        {/* your messages strip (logged-in only) */}
        {user && mine && mine.length > 0 && (
          <section style={s("margin: 0 0 30px; padding: 16px 20px 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px;")}>
            <h2 style={s("margin: 0 0 6px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.6);")}>Your messages</h2>
            {mine.map((m, i) => (
              <div key={m.id} style={s(`padding: 10px 0; ${i ? "border-top: 1px solid rgba(255,255,255,0.06);" : ""}`)}>
                <div style={s("display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;")}>
                  <p style={s("margin: 0; flex: 1; min-width: 200px; font-size: 14px; line-height: 1.5; color: rgba(236,236,246,0.85); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{m.body}</p>
                  <span style={s("display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0;")}>
                    <StatusChip status={m.status} />
                    <span style={s("font-size: 12px; color: rgba(255,255,255,0.4);")}>{relTime(m.created_at)}</span>
                  </span>
                </div>
                {m.status === "rejected" && m.rejection_reason && (
                  <p style={s("margin: 5px 0 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.45);")}>{m.rejection_reason}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* grid header */}
        <div style={s("display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px;")}>
          <p style={s("margin: 0; font-size: 13px; color: rgba(226,226,240,0.55);")}>Memories from across the Spider-Verse.</p>
          <Link href="/#mjwall" data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 8px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.85); text-decoration: none; transition: color 200ms ease;")}>Write a message <span style={{ fontSize: "15px" }}>›</span></Link>
        </div>

        {state === "loading" && (
          <p style={s("margin: 0; padding: 48px 0; text-align: center; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.45);")}>Threading the web…</p>
        )}

        {state === "error" && (
          <div style={s("padding: 48px 24px; text-align: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px;")}>
            <p style={s("margin: 0 0 14px; font-size: 15px; color: rgba(226,226,240,0.7);")}>The wall slipped out of reach. Give it another shot.</p>
            <button onClick={loadWall} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; padding: 4px 0;")}>Retry ›</button>
          </div>
        )}

        {state === "ready" && wall.messages.length === 0 && (
          <div style={s("padding: 60px 24px; text-align: center; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.14); border-radius: 14px;")}>
            <p style={s("margin: 0 0 16px; font-size: 15px; color: rgba(226,226,240,0.7);")}>The wall is waiting for its first memory.</p>
            <Link href="/#mjwall" data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 8px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #ff5a6a; text-decoration: none; transition: color 200ms ease;")}>Write yours ›</Link>
          </div>
        )}

        {state === "ready" && wall.messages.length > 0 && (
          <>
            <div style={s("display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; align-items: start;")}>
              {wall.messages.map((m) => (
                <article key={m.id} style={s("background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; gap: 14px;")}>
                  <p style={s("margin: 0; font-size: 15px; line-height: 1.6; color: rgba(236,236,246,0.92); text-wrap: pretty; white-space: pre-wrap; overflow-wrap: anywhere;")}>{m.body}</p>
                  <div style={s("font-size: 12px; color: rgba(255,255,255,0.45);")}>— u/{m.author.username} <span style={{ opacity: 0.6 }}>·</span> {relTime(m.createdAt)}</div>
                </article>
              ))}
            </div>

            {wall.nextCursor && (
              <div style={s("display: flex; justify-content: center; padding: 28px 0 0;")}>
                <button onClick={loadMore} disabled={loadingMore} data-web-hover="true" style={s(`border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); border-radius: 999px; padding: 12px 30px; cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.2em; text-transform: uppercase; opacity: ${loadingMore ? "0.6" : "1"}; transition: opacity .2s ease;`)}>
                  {loadingMore ? "Loading…" : "Load more ›"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
