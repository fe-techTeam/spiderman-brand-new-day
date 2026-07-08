/* eslint-disable @next/next/no-img-element */
"use client";

// The MJ Wall — "Living Memory Wall" (ported from MJ Wall.dc.html). Memory
// cards are dealt into columns that drift on their own — odd columns scroll
// up, even columns scroll down, each looping seamlessly (the column content
// is doubled; sparse walls repeat their entries until every column is full).
// Hovering a column holds it. Cards expand into a modal, and the composer
// posts to the real API.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { s } from "@/lib/style";
import { useSession } from "@/components/auth/SessionProvider";
import { portalApi } from "@/lib/portal/api";

/* card palettes cycle red / blue / yellow (verbatim from the mockup) */
const PALS = [
  { edgeA: "rgba(255,40,60,0.4)", edgeB: "rgba(120,40,50,0.2)", bg: "linear-gradient(150deg, rgba(24,12,16,0.96), rgba(12,9,16,0.97))", accent: "#ff5a6a" },
  { edgeA: "rgba(120,150,220,0.4)", edgeB: "rgba(40,60,110,0.2)", bg: "linear-gradient(150deg, rgba(14,18,34,0.96), rgba(10,10,20,0.97))", accent: "#7ea6ff" },
  { edgeA: "rgba(255,210,63,0.4)", edgeB: "rgba(120,90,20,0.2)", bg: "linear-gradient(150deg, rgba(24,20,10,0.96), rgba(14,11,8,0.97))", accent: "#ffd23f" },
];
/* seeded wall (mockup copy) — shown until the API answers / when it's empty */
const SEED_RAW = [
  ["Priya N.", "He always looked out for the little guy — even when nobody was watching."],
  ["Leo M.", "Peter never let go of a promise. Remind her of that."],
  ["Diego A.", "The way he'd crack a joke mid-swing so you'd stop being scared."],
  ["Hana K.", "He'd give up his own good day to save yours. Every single time."],
  ["Sam W.", "MJ — he chose you before he chose anything else."],
  ["Aisha B.", "He'd show up soaked from the rain just to check you got home."],
  ["Tomás S.", "He carried the whole city and still asked how your day was."],
  ["Grace L.", "The kid from Queens who never once thought he was a hero."],
  ["Noah A.", "He'd remember the small things nobody else did. Your coffee order."],
  ["Mia R.", "He'd smile like the mask was never even there."],
  ["Kai T.", "He believed anyone could wear it. He just believed in her most."],
  ["Sofia G.", "Peter never wanted to be remembered. Which is why he should be."],
  ["Ravi P.", "He'd swing across the whole borough for a friend. No questions."],
  ["Elena V.", "The bravest thing about him was how gentle he stayed."],
  ["Jordan H.", "He laughed the loudest at his own bad puns."],
  ["Amara O.", "He made a scary world feel a little more like home."],
  ["Ben C.", "He'd always find you in a crowd. Always."],
  ["Lin W.", "The one who caught you before you knew you were falling."],
  ["Yusuf D.", "He never once asked for thanks. Remind her anyway."],
  ["Chloe M.", "Peter's whole heart was in every save. She was most of it."],
  ["Isha R.", "He'd rather be late than leave someone behind."],
];
const SEEDS = SEED_RAW.map(([name, text], i) => ({ id: `s${i}`, name, initial: name[0], text, ...PALS[i % PALS.length] }));

const MSG_MAX = 280; // hard message cap — long walls of text break the cards

const mapMsg = (m, i) => ({
  id: m.id,
  name: "u/" + m.author.username,
  initial: m.author.username[0].toUpperCase(),
  pic: m.author.avatarPic || null, // identity profile picture (avatars master)
  text: m.body,
  ...PALS[i % PALS.length],
});

export default function MjWallPage() {
  const { user, openAuth } = useSession();
  const [messages, setMessages] = useState(SEEDS); // seeded copy stays as the fallback
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState("");
  const [justSent, setJustSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [ncol, setNcol] = useState(4);
  const inputRef = useRef(null);
  const spotRef = useRef(null);

  /* live messages — only admin-approved ones ever render on the wall (the
     latest page; the looping columns repeat entries, so one page is plenty) */
  useEffect(() => {
    let on = true;
    portalApi("/mj-wall/messages?limit=30")
      .then((data) => {
        if (!on || !Array.isArray(data.messages) || !data.messages.length) return;
        setMessages(data.messages.map(mapMsg));
      })
      .catch(() => {}); // the seeded wall stays up
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* cursor spotlight follows the pointer (eased RAF, from the mockup) */
  useEffect(() => {
    let sx = window.innerWidth / 2, sy = window.innerHeight / 2;
    let tx = sx, ty = sy, raf = null;
    const tick = () => {
      sx += (tx - sx) * 0.12;
      sy += (ty - sy) * 0.12;
      if (spotRef.current) spotRef.current.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
      raf = Math.abs(tx - sx) > 0.5 || Math.abs(ty - sy) > 0.5 ? requestAnimationFrame(tick) : null;
    };
    const onMove = (e) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener("mousemove", onMove, { passive: true });
    tick();
    const onResize = () => setNcol(window.innerWidth < 760 ? 2 : 4);
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const post = async () => {
    const t = draft.trim().slice(0, MSG_MAX);
    if (!t) { inputRef.current && inputRef.current.focus(); return; }
    if (!user) { openAuth("login"); return; }
    if (sending) return;
    setSending(true);
    setSendError("");
    try {
      // the message goes to moderation — it only joins the wall once approved,
      // so nothing is added optimistically here
      await portalApi("/mj-wall/messages", { method: "POST", body: { body: t } });
      setDraft("");
      setJustSent(true);
    } catch (err) {
      if (err.code === "quiz_required") { window.location.href = "/quiz"; return; }
      setSendError(err.message || "Couldn't send your memory. Try again.");
    } finally {
      setSending(false);
    }
  };

  /* deal the cards round-robin into the drifting columns. Sparse walls repeat
     their entries until every column holds enough cards for a seamless loop —
     the wall must never look empty */
  const MIN_PER_COL = 6;
  let deck = messages;
  if (messages.length && messages.length < ncol * MIN_PER_COL) {
    const reps = Math.ceil((ncol * MIN_PER_COL) / messages.length);
    deck = Array.from({ length: reps }, () => messages).flat();
  }
  const cols = Array.from({ length: ncol }, () => []);
  deck.forEach((m, i) => cols[i % ncol].push({ ...m, idx: i }));

  const cardBody = (m) => (
    <div style={{ background: m.bg, clipPath: "polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px)", padding: "15px 16px" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill={m.accent} style={{ opacity: 0.5, marginBottom: "7px" }}><path d="M10 7L8 11h3v6H5v-6l2-4h3zm9 0l-2 4h3v6h-6v-6l2-4h3z" /></svg>
      <p style={s("margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: rgba(240,240,250,0.92); text-wrap: pretty;")}>{m.text}</p>
      <div style={s("display: flex; align-items: center; gap: 8px; min-width: 0;")}>
        {m.pic ? (
          <img src={m.pic} alt="" style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${m.accent}` }} />
        ) : (
          <span style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", background: m.accent, color: "#0a0713", fontFamily: "'Oswald', sans-serif", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{m.initial}</span>
        )}
        <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.04em; color: rgba(255,255,255,0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;")}>{m.name}</span>
      </div>
    </div>
  );

  return (
    <div className="mjw-page" style={s("position: relative; display: flex; flex-direction: column; overflow: hidden; background: radial-gradient(120% 90% at 50% -10%, #2a0510 0%, #0d0713 48%, #08060c 100%);")}>

      {/* ambient motes */}
      <div style={s("position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden;")}>
        <span style={s("position: absolute; left: 12%; bottom: 22%; width: 4px; height: 4px; border-radius: 50%; background: #ff5a6a; box-shadow: 0 0 10px 2px rgba(255,60,74,0.7); animation: mjw-float 9s ease-in-out infinite;")}></span>
        <span style={s("position: absolute; left: 38%; bottom: 12%; width: 3px; height: 3px; border-radius: 50%; background: #fff; box-shadow: 0 0 8px 2px rgba(255,255,255,0.6); animation: mjw-float 12s ease-in-out infinite 2s;")}></span>
        <span style={s("position: absolute; left: 72%; bottom: 18%; width: 5px; height: 5px; border-radius: 50%; background: #ff5a6a; box-shadow: 0 0 12px 3px rgba(255,60,74,0.6); animation: mjw-float 10s ease-in-out infinite 4s;")}></span>
        <span style={s("position: absolute; left: 88%; bottom: 26%; width: 3px; height: 3px; border-radius: 50%; background: #9db4ff; box-shadow: 0 0 9px 2px rgba(120,150,255,0.6); animation: mjw-float 11s ease-in-out infinite 1s;")}></span>
      </div>

      {/* cinematic god-rays */}
      <div style={s("position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; mix-blend-mode: screen;")}>
        <div style={s("position: absolute; top: -30%; left: 8%; width: 22vw; height: 160%; background: linear-gradient(180deg, rgba(255,60,74,0.16), transparent 70%); transform: rotate(9deg); filter: blur(24px); animation: mjw-ray 13s ease-in-out infinite;")}></div>
        <div style={s("position: absolute; top: -30%; right: 12%; width: 18vw; height: 160%; background: linear-gradient(180deg, rgba(120,150,255,0.13), transparent 70%); transform: rotate(-7deg); filter: blur(26px); animation: mjw-ray 17s ease-in-out infinite 2s;")}></div>
      </div>

      {/* giant heartbeat spider emblem behind the wall */}
      <div style={s("position: fixed; top: 46%; left: 50%; transform: translate(-50%,-50%); z-index: 0; width: min(72vh, 720px); height: min(72vh, 720px); pointer-events: none; animation: mjw-heartbeat 3.2s ease-in-out infinite;")}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", opacity: 0.5 }} fill="none" stroke="rgba(255,47,64,0.35)" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="50" cy="44" rx="9" ry="12" /><path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" /></svg>
      </div>

      {/* cursor spotlight */}
      <div ref={spotRef} style={s("position: fixed; top: 0; left: 0; z-index: 2; width: 640px; height: 640px; margin: -320px 0 0 -320px; border-radius: 50%; background: radial-gradient(circle, rgba(255,90,110,0.12) 0%, rgba(255,60,74,0.05) 35%, transparent 66%); pointer-events: none; will-change: transform; mix-blend-mode: screen; transition: opacity .4s ease;")}></div>

      {/* MJ reflection overlay (faint, does not affect legibility) */}
      <div style={s("position: fixed; inset: 0; z-index: 12; pointer-events: none; background-image: url('/assets/mj-portrait.jpg'); background-size: cover; background-position: center 28%; mix-blend-mode: screen; animation: mjw-mj-pulse 7s ease-in-out infinite;")}></div>

      {/* vignette + flicker */}
      <div style={s("position: fixed; inset: 0; z-index: 15; pointer-events: none; background: radial-gradient(120% 90% at 50% 42%, transparent 48%, rgba(4,3,8,0.5) 82%, rgba(3,2,6,0.82) 100%);")}></div>
      <div style={s("position: fixed; inset: 0; z-index: 15; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent 30%); animation: mjw-flicker 4s ease-in-out infinite;")}></div>

      {/* TOP BAR */}
      <header style={s("position: relative; z-index: 30; flex-shrink: 0; display: flex; align-items: center; gap: clamp(14px, 2vw, 28px); padding: 12px clamp(18px, 3vw, 40px); background: transparent;")}>
        <Link href="/" style={s("display: flex; align-items: center; gap: 12px; text-decoration: none; flex-shrink: 0;")}>
          <img src="/assets/nav-logo.png" alt="Brand New Day" style={s("height: 40px; width: auto; display: block;")} />
        </Link>
        <Link href="/" data-web-hover="true" className="link-hover-red" style={s("margin-left: auto; text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.6); transition: color 200ms ease;")}>‹ Back to Home</Link>
      </header>

      {/* TITLE */}
      <div style={s("position: relative; z-index: 20; flex-shrink: 0; text-align: center; margin-top: -40px; padding: clamp(20px, 4vh, 40px) 24px clamp(12px, 2vh, 20px);")}>
        <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 12px; animation: mjw-rise .7s ease both;")}>
          <span style={s("width: 40px; height: 2px; background: linear-gradient(90deg, transparent, #ff2f40);")}></span>
          <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff5a6a;")}>The Living Memory Wall</span>
          <span style={s("width: 40px; height: 2px; background: linear-gradient(90deg, #ff2f40, transparent);")}></span>
        </div>
        <h1 style={s("font-family: 'Oswald', sans-serif; font-size: clamp(28px, 4.6vw, 56px); line-height: 1; font-weight: 500; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.5); animation: mjw-title-in 1s cubic-bezier(.16,.84,.3,1) both;")}>Help MJ <span style={{ color: "#ff2f40" }}>remember.</span></h1>
        <p style={s("margin: 12px auto 0; max-width: 540px; font-size: clamp(13px, 1.4vw, 15px); line-height: 1.55; color: rgba(226,226,240,0.66); animation: mjw-rise 1s ease .3s both;")}>Memories of Peter, flowing in from every corner of the Web.</p>
      </div>

      {/* THE LIVING WALL — every column loops on its own (its content renders
          twice for a seamless wrap): odd columns drift up, even columns drift
          down. Hovering a column holds it still; the modal holds them all. */}
      <div className={`mjw-viewport${selected ? " mjw-hold" : ""}`} style={{ position: "relative", zIndex: 10, flex: 1, minHeight: 0, width: "100%", maxWidth: "1380px", margin: "0 auto", boxSizing: "border-box", padding: "0 clamp(14px, 3vw, 40px)", overflow: "hidden" }}>
        <div style={s("display: flex; gap: clamp(12px, 1.4vw, 20px); justify-content: center; align-items: stretch; height: 100%;")}>
          {cols.map((col, ci) => {
            const drift = ci % 2 === 0 ? "mjw-loop-up" : "mjw-loop-down";
            const dur = Math.max(30, col.length * 6 + ci * 4); // ~constant px/s, slightly desynced per column
            return (
              <div key={ci} className="mjw-col" style={s("flex: 1 1 0; min-width: 0; max-width: 320px; height: 100%; overflow: hidden;")}>
                <div className="mjw-col-loop" style={{ animation: `${drift} ${dur}s linear infinite` }}>
                  {[0, 1].map((copy) => (
                    <div key={copy} aria-hidden={copy === 1 || undefined} style={s("display: flex; flex-direction: column;")}>
                      {col.map((m) => (
                        <div key={`${copy}-${m.idx}`} className="mjw-card" onClick={() => setSelected(m)} data-web-hover="true" style={{ position: "relative", marginBottom: "clamp(12px, 1.4vw, 18px)", padding: "1px", background: `linear-gradient(150deg, ${m.edgeA}, ${m.edgeB})`, clipPath: "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)", cursor: "pointer", animation: copy === 0 ? "mjw-rise .55s ease both" : undefined, animationDelay: copy === 0 ? `${Math.min(m.idx, 12) * 45}ms` : undefined }}>
                          {cardBody(m)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EXPANDED CARD MODAL */}
      {selected && (
        <div onClick={() => setSelected(null)} style={s("position: fixed; inset: 0; z-index: 60; background: rgba(4,3,8,0.82); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: mjw-rise .32s ease both;")}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(600px, 100%)", padding: "2px", background: `linear-gradient(150deg, ${selected.edgeA}, ${selected.edgeB})`, clipPath: "polygon(26px 0, 100% 0, 100% calc(100% - 26px), calc(100% - 26px) 100%, 0 100%, 0 26px)", boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 50px rgba(255,40,60,0.25)" }}>
            <div style={{ position: "relative", background: selected.bg, clipPath: "polygon(25px 0, 100% 0, 100% calc(100% - 25px), calc(100% - 25px) 100%, 0 100%, 0 25px)", padding: "clamp(32px, 5vw, 52px)" }}>
              <svg width="46" height="46" viewBox="0 0 24 24" fill={selected.accent} style={{ opacity: 0.5, marginBottom: "18px" }}><path d="M10 7L8 11h3v6H5v-6l2-4h3zm9 0l-2 4h3v6h-6v-6l2-4h3z" /></svg>
              <p style={s("margin: 0 0 26px; font-family: 'Oswald', sans-serif; font-weight: 400; text-transform: none; font-size: clamp(20px, 2.8vw, 30px); line-height: 1.35; color: #fff; text-wrap: pretty;")}>{selected.text}</p>
              <div style={s("display: flex; align-items: center; gap: 12px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);")}>
                {selected.pic ? (
                  <img src={selected.pic} alt="" style={{ flexShrink: 0, width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${selected.accent}` }} />
                ) : (
                  <span style={{ flexShrink: 0, width: "40px", height: "40px", borderRadius: "50%", background: selected.accent, color: "#0a0713", fontFamily: "'Oswald', sans-serif", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{selected.initial}</span>
                )}
                <div>
                  <div style={s("font-family: 'Oswald', sans-serif; font-size: 16px; letter-spacing: 0.04em; color: #fff;")}>{selected.name}</div>
                  <div style={s("font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.4);")}>Left this for MJ</div>
                </div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} aria-label="Close" data-web-hover="true" style={s("position: absolute; top: 14px; right: 14px; z-index: 3; width: 38px; height: 38px; border-radius: 50%; border: 0; background: linear-gradient(180deg, #ff3a4a, #c00014); color: #fff; font-size: 20px; cursor: pointer; box-shadow: 0 8px 22px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.08); font-family: inherit; line-height: 1; display: flex; align-items: center; justify-content: center;")}>×</button>
          </div>
        </div>
      )}

      {/* COMPOSER (sticks to the bottom while the wall scrolls) */}
      <div style={s("position: sticky; bottom: 0; z-index: 30; flex-shrink: 0; padding: clamp(12px, 2vh, 20px) clamp(16px, 4vw, 60px) clamp(16px, 2.5vh, 26px); background: linear-gradient(0deg, #08060c 60%, rgba(8,6,12,0) 100%);")}>
        <div style={s("max-width: 900px; margin: 0 auto;")}>
          {justSent ? (
            <div style={s("display: flex; align-items: center; justify-content: center; gap: 12px; padding: 10px; animation: mjw-rise .5s ease both; flex-wrap: wrap;")}>
              <span style={s("width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(180deg, #ffd23f, #f7a91d); color: #6b2a00; display: flex; align-items: center; justify-content: center; font-size: 17px;")}>✓</span>
              <span style={s("font-size: 14px; color: rgba(255,255,255,0.85);")}>Sent! Your memory joins the wall once it&apos;s approved.</span>
              <a href="#" onClick={(e) => { e.preventDefault(); setJustSent(false); setTimeout(() => inputRef.current && inputRef.current.focus(), 50); }} data-web-hover="true" style={s("color: #ff5a6a; text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;")}>Write another ›</a>
            </div>
          ) : (
            <>
              <div style={s("position: relative; padding: 2px; background: linear-gradient(180deg, #ff3a4a, #8b000d); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);")}>
                <div style={s("background: #060e2a; clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); padding: 12px 14px 12px 18px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;")}>
                  <input
                    id="mjw-composer"
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MSG_MAX))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); post(); } }}
                    maxLength={MSG_MAX}
                    placeholder="Remind MJ of one thing about Peter…"
                    style={s("flex: 1; min-width: 180px; border: 0; outline: 0; background: transparent; color: #fff; text-shadow: 0 0 8px rgba(255,255,255,0.3); font-family: inherit; font-size: 15px;")}
                  />
                  {draft.length >= MSG_MAX * 0.6 && (
                    <span style={s(`flex-shrink: 0; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.08em; color: ${draft.length >= MSG_MAX ? "#ff6b79" : "rgba(255,255,255,0.4)"};`)}>{draft.length}/{MSG_MAX}</span>
                  )}
                  <button onClick={post} disabled={sending} data-web-hover="true" className="mjw-cta" style={s(`flex-shrink: 0; position: relative; border: 0; padding: 0; background: transparent; cursor: ${sending ? "default" : "pointer"}; opacity: ${sending ? "0.7" : "1"}; font-family: inherit;`)}>
                    <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #1f4cd6, #0b2a8a); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);")}>
                      <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 12px 24px; background: linear-gradient(180deg, #ffd23f, #f7a91d); clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px); color: #6b2a00; font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase;")}><span className="mjw-sheen"></span>Send to MJ</span>
                    </span>
                  </button>
                </div>
              </div>
              {sendError && <p style={s("margin: 8px 4px 0; font-size: 12px; color: #ff6b79;")}>{sendError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
