"use client";

// The Avatar Experience — the identity quiz, ported from the Claude Design
// "Reveal My Identity" page. Session-gated; fetches the live questions from
// /api/quiz, auto-advances one question per screen, submits to /api/quiz/submit
// and reveals the assigned Spider identity with the cinematic reward screen
// (collectible card when the avatar master has artwork, emblem fallback
// otherwise; Web Twins + Retake CTAs). Users who already completed the quiz
// land straight on the reveal.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { portalApi } from "@/lib/portal/api";
import { useSession } from "@/components/auth/SessionProvider";
import Nav from "@/components/main/Nav";

const EYEBROW = "font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;";
const ERR_LINE = "margin: 14px 0 0; font-size: 13px; color: #ff5a6a;";
const GHOST_LINK = "border: 0; background: transparent; cursor: pointer; padding: 0; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55); transition: color .2s ease;";
const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

const hexGlow = (hex, a = 0.55) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return `rgba(255,58,74,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function Eyebrow({ children, centered }) {
  return (
    <div style={s(`display: inline-flex; align-items: center; gap: 10px; ${centered ? "justify-content: center;" : ""}`)}>
      <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
      <span style={s(EYEBROW)}>{children}</span>
      {centered && <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, #ff5a6a, transparent);")}></span>}
    </div>
  );
}

function RedCta({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-web-hover="true" className="bnd-cta" style={s(`width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: ${disabled ? "default" : "pointer"}; font-family: inherit; opacity: ${disabled ? 0.6 : 1};`)}>
      <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
        <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 15px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>{children}</span>
      </span>
    </button>
  );
}

// AuthModal's cut-corner panel, reused for the logged-out gate.
function Panel({ children, width = "min(560px, 100%)" }) {
  return (
    <div style={s(`animation: ri-rise 520ms cubic-bezier(.2,.7,.2,1) both; position: relative; width: ${width}; padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3);`)}>
      <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(30px, 6vw, 44px) clamp(24px, 5vw, 38px); text-align: center;")}>
        {children}
      </div>
    </div>
  );
}

export default function QuizPage() {
  const router = useRouter();
  const { user, loading, refresh, openAuth } = useSession();

  // The navbar stays up during onboarding so the UI (and the logo) is retained.
  const [isDesktop, setIsDesktop] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 760;
      setIsDesktop(desktop);
      if (desktop) setMobileMenuOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const navItems = [
    { label: "TRAILER", href: "/" },
    { label: "MJ WALL", href: "/mj-wall" },
    { label: "FORUM", href: "/forum" },
    { label: "SPIDEY TRACKER", href: "/" },
  ].map((it) => ({
    label: it.label, locked: false, active: false,
    color: "#fff", cursor: "pointer", title: "",
    onClick: (e) => { e.preventDefault(); router.push(it.href); },
    onMobileClick: (e) => { e.preventDefault(); setMobileMenuOpen(false); router.push(it.href); },
  }));
  const nav = (
    <Nav
      isDesktop={isDesktop}
      mobileMenuVisible={!isDesktop && mobileMenuOpen}
      navItems={navItems}
      onGoHome={() => router.push("/")}
      onGetStarted={() => openAuth("register")}
      onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
      onMobileSwingIn={() => { setMobileMenuOpen(false); openAuth("register"); }}
    />
  );

  const [questions, setQuestions] = useState(null);
  const [qErr, setQErr] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [result, setResult] = useState(null);
  const [retake, setRetake] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  /* ---- pick/reveal ticks (compact port of the design's WebAudio cues) ---- */
  const acRef = useRef(null);
  const ensureAudio = () => {
    try {
      if (!acRef.current) acRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (acRef.current.state === "suspended") acRef.current.resume();
      return acRef.current;
    } catch { return null; }
  };
  const tick = (type) => {
    const ac = ensureAudio();
    if (!ac) return;
    const now = ac.currentTime;
    if (type === "pick") {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(660, now); o.frequency.exponentialRampToValueAtTime(990, now + 0.08);
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.12, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      o.connect(g); g.connect(ac.destination); o.start(now); o.stop(now + 0.18);
    } else if (type === "reveal") {
      const master = ac.createGain(); master.gain.value = 0.3; master.connect(ac.destination);
      [220, 330, 440, 660].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = i < 2 ? "sine" : "triangle";
        o.frequency.setValueAtTime(f * 0.6, now); o.frequency.exponentialRampToValueAtTime(f, now + 0.5 + i * 0.05);
        g.gain.setValueAtTime(0.0001, now + i * 0.06); g.gain.linearRampToValueAtTime(0.3, now + 0.12 + i * 0.06); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        o.connect(g); g.connect(master); o.start(now + i * 0.06); o.stop(now + 1.7);
      });
      const bo = ac.createOscillator(), bg = ac.createGain();
      bo.type = "sine"; bo.frequency.setValueAtTime(150, now + 0.28); bo.frequency.exponentialRampToValueAtTime(50, now + 0.6);
      bg.gain.setValueAtTime(0.0001, now + 0.28); bg.gain.linearRampToValueAtTime(0.5, now + 0.32); bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      bo.connect(bg); bg.connect(master); bo.start(now + 0.28); bo.stop(now + 0.78);
    }
  };

  // Existing avatar → jump straight to the reveal (unless retaking).
  const reveal =
    result ||
    (user && user.avatar && !user.needsQuiz && !retake
      ? { avatar: user.avatar, spideyCode: user.spideyCode, fromProfile: true }
      : null);

  // Fetch the questions once the session allows it and we actually need them.
  useEffect(() => {
    if (loading || !user || result) return;
    if (user.avatar && !user.needsQuiz && !retake) return;
    let alive = true;
    setQErr("");
    portalApi("/quiz")
      .then((data) => { if (alive) setQuestions(data.questions || []); })
      .catch((err) => { if (alive) setQErr(err.message); });
    return () => { alive = false; };
  }, [loading, user, retake, result]);

  const total = questions ? questions.length : 0;

  async function submitQuiz(ansMap) {
    setSubmitting(true);
    setSubmitErr("");
    try {
      const payload = questions.map((q) => ({ questionId: q.id, optionId: ansMap[q.id] }));
      const data = await portalApi("/quiz/submit", { method: "POST", body: { answers: payload } });
      setResult({ avatar: data.avatar, spideyCode: data.spideyCode });
      setTimeout(() => tick("reveal"), 120);
      refresh().catch(() => {}); // session picks up needsQuiz=false + the avatar
    } catch (err) {
      setSubmitErr(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const pick = (q, optionId) => {
    if (submitting) return;
    const next = { ...answers, [q.id]: optionId };
    setAnswers(next);
    tick("pick");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (idx < total - 1) setIdx(idx + 1);
      else submitQuiz(next);
    }, 250);
  };

  const goBack = () => {
    clearTimeout(timerRef.current);
    setIdx((i) => Math.max(0, i - 1));
  };

  const startRetake = () => {
    // a new identity means the Web Twins reveal must be re-opened afresh
    try { localStorage.removeItem("bnd_twins_revealed"); } catch {}
    setRetake(true);
    setResult(null);
    setQuestions(null);
    setQErr("");
    setAnswers({});
    setIdx(0);
    setSubmitErr("");
  };

  // /quiz?retake=1 (navbar profile popup) starts straight in retake mode
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("retake") === "1") startRetake();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Location is no longer asked here — country is derived from the signup IP.
  async function enterForum() {
    setSaving(true);
    setSaveErr("");
    try {
      await refresh();
      router.push("/forum");
    } catch (err) {
      setSaveErr(err.message);
      setSaving(false);
    }
  }

  const goToTwins = () => {
    try { localStorage.setItem("bnd_twins_revealed", "1"); } catch {}
    router.push("/#livingweb");
  };

  /* card tilt (reveal) — DOM-driven, no re-renders */
  const tiltRef = useRef(null);
  const glareRef = useRef(null);
  const onTilt = (e) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${(px * 16).toFixed(2)}deg) rotateX(${(-py * 16).toFixed(2)}deg) scale(1.04)`;
    if (glareRef.current) {
      glareRef.current.style.opacity = "1";
      glareRef.current.style.background = `radial-gradient(circle at ${((px + 0.5) * 100).toFixed(1)}% ${((py + 0.5) * 100).toFixed(1)}%, rgba(255,255,255,0.3), transparent 42%)`;
    }
  };
  const onTiltOut = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "rotateY(0) rotateX(0) scale(1)";
    if (glareRef.current) glareRef.current.style.opacity = "0";
  };

  /* ================================================================ shell */
  // Cinematic stage shared by every state (design: Reveal My Identity.dc.html).
  // reveal-bg.jpg is referenced but pending the next design asset export — the
  // dark base + gradients carry the scene until it lands. A render helper
  // (not a component) so state changes never remount the stage.
  const shell = (children) => (
    <div style={s("position: relative; min-height: 100vh; background: #07060c; overflow: hidden;")}>
      <div style={s("position: fixed; inset: 0; z-index: 0; background-color: #07060c; background-image: url('/assets/reveal-bg.jpg'); background-size: cover; background-position: center; will-change: transform; animation: ri-bg-breathe 16s ease-in-out infinite;")}></div>
      <div style={s("position: fixed; inset: 0; z-index: 0; background: radial-gradient(120% 90% at 50% -10%, rgba(38,6,15,0.55) 0%, rgba(13,7,19,0.72) 48%, rgba(7,6,12,0.9) 100%); pointer-events: none;")}></div>
      <div style={s("position: fixed; top: 46%; left: 50%; width: 55vh; height: 55vh; transform: translate(-50%,-50%); z-index: 0; border-radius: 50%; background: radial-gradient(circle, rgba(214,2,26,0.28) 0%, transparent 68%); filter: blur(20px); animation: ri-pulse-glow 5s ease-in-out infinite; pointer-events: none;")}></div>
      <div style={s("position: fixed; inset: 0; z-index: 0; overflow: hidden; mix-blend-mode: screen; pointer-events: none;")}>
        <div style={s("position: absolute; top: -30%; left: 12%; width: 24vw; height: 160%; background: linear-gradient(180deg, rgba(255,60,74,0.18), transparent 72%); filter: blur(30px); animation: ri-ray-drift 13s ease-in-out infinite;")}></div>
        <div style={s("position: absolute; top: -30%; right: 14%; width: 20vw; height: 160%; background: linear-gradient(180deg, rgba(120,150,255,0.14), transparent 72%); filter: blur(32px); animation: ri-ray-drift2 17s ease-in-out infinite;")}></div>
        <span style={s("position: absolute; left: 20%; bottom: 18%; width: 4px; height: 4px; border-radius: 50%; background: #ff5a6a; box-shadow: 0 0 10px 2px rgba(255,60,74,0.7); animation: ri-mote 9s ease-in-out infinite;")}></span>
        <span style={s("position: absolute; left: 74%; bottom: 24%; width: 3px; height: 3px; border-radius: 50%; background: #9db4ff; box-shadow: 0 0 8px 2px rgba(120,150,255,0.6); animation: ri-mote 11s ease-in-out infinite 2s;")}></span>
      </div>
      <div style={s("position: fixed; inset: 0; z-index: 12; pointer-events: none; background: radial-gradient(120% 90% at 50% 42%, transparent 52%, rgba(4,3,8,0.5) 84%, rgba(3,2,6,0.85) 100%);")}></div>
      {nav}
      {/* top padding = just enough to clear the fixed navbar; near-symmetric
          bottom keeps the content optically centered like the design */}
      <main className="ri-stage" style={s("position: relative; z-index: 20; min-height: 100dvh; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: clamp(72px, 10vh, 96px) clamp(20px, 6vw, 90px) clamp(24px, 5vh, 56px); text-align: center;")}>
        {children}
      </main>
    </div>
  );

  // ---- session loading ----
  if (loading) {
    return shell(
      <div style={s("font-family: 'Oswald', sans-serif; font-size: 30px; letter-spacing: 0.3em; color: rgba(255,255,255,0.4);")}>…</div>
    );
  }

  // ---- logged out gate ----
  if (!user) {
    return shell(
      <Panel width="min(440px, 100%)">
        <Eyebrow centered>Members Only</Eyebrow>
        <h1 style={s("margin: 12px 0 0; font-family: 'Oswald', sans-serif; font-size: clamp(26px, 6vw, 34px); line-height: 1; font-weight: 500; text-transform: uppercase; color: #fff;")}>Swing in first</h1>
        <p style={s("margin: 14px auto 24px; max-width: 320px; font-size: 14px; line-height: 1.6; color: rgba(232,232,244,0.7);")}>The Avatar Experience needs a web identity. Log in and we&apos;ll find out who you are under the mask.</p>
        <RedCta onClick={() => openAuth("login")}>Swing In</RedCta>
      </Panel>
    );
  }

  // ---- reveal / reward screen ----
  if (reveal) {
    const av = reveal.avatar || {};
    const heroColor = av.color || "#ff3a4a";
    const heroGlow = hexGlow(heroColor, 0.55);
    const sparks = [12, 26, 38, 44, 50, 58, 64, 72, 80, 88];
    return shell(
      <>
        {/* scan sweep + energy burst + color flash + rising sparks */}
        <div style={s("position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 1;")}>
          <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: "2px", opacity: 0, background: `linear-gradient(90deg, transparent, ${heroColor}, transparent)`, boxShadow: `0 0 20px ${heroColor}`, animation: "ri-scan 2.4s cubic-bezier(.5,0,.5,1) 1 forwards" }}></span>
          <span style={{ position: "absolute", top: "38%", left: "50%", width: 40, height: 40, margin: "-20px 0 0 -20px", borderRadius: "50%", border: `2px solid ${heroColor}`, animation: "ri-burst 2.4s cubic-bezier(.16,.84,.3,1) 1 both" }}></span>
          <span style={{ position: "absolute", top: "38%", left: "50%", width: 40, height: 40, margin: "-20px 0 0 -20px", borderRadius: "50%", border: `1px solid ${heroColor}`, animation: "ri-burst 2.6s cubic-bezier(.16,.84,.3,1) .25s 1 both" }}></span>
          <span style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%, ${heroGlow} 0%, transparent 55%)`, opacity: 0, animation: "ri-flash 1.4s ease-out 1 both" }}></span>
          {sparks.map((x, i) => (
            <span key={i} style={{ position: "absolute", left: `${x}%`, top: "40%", width: `${3 + (i % 3)}px`, height: `${3 + (i % 3)}px`, borderRadius: "50%", background: heroColor, boxShadow: `0 0 8px ${heroColor}`, opacity: 0, animation: `ri-spark ${2.6 + (i % 4) * 0.4}s ease-out ${i * 0.22}s infinite` }}></span>
          ))}
        </div>

        <div style={s("position: relative; display: flex; flex-direction: column; align-items: center; animation: ri-rise .8s ease both;")}>
          {/* Spidey Code eyebrow */}
          <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: clamp(24px, 4vh, 44px); flex-wrap: wrap; justify-content: center;")}>
            <span style={{ width: 26, height: 1, background: `linear-gradient(90deg, transparent, ${heroColor})` }}></span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: rgba(255,255,255,0.5);")}>Spidey Code</span>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.2em", color: heroColor, textShadow: `0 0 12px ${heroGlow}` }}>{reveal.spideyCode || "—"}</span>
            <span style={{ width: 26, height: 1, background: `linear-gradient(90deg, ${heroColor}, transparent)` }}></span>
          </div>

          {av.card ? (
            /* COLLECTIBLE CARD (identities with artwork in the avatars master) */
            <div style={s("perspective: 1200px; animation: ri-card-in 1s cubic-bezier(.16,.84,.3,1) both;")}>
              <div ref={tiltRef} onMouseMove={onTilt} onMouseLeave={onTiltOut} style={s("position: relative; display: inline-block; will-change: transform; transition: transform .3s cubic-bezier(.16,.84,.3,1);")}>
                <div style={{ position: "absolute", inset: "-6% -6% -2%", borderRadius: 22, background: `radial-gradient(circle at 50% 40%, ${heroGlow} 0%, transparent 68%)`, filter: "blur(22px)", animation: "ri-pulse-glow 4.5s ease-in-out infinite", pointerEvents: "none" }}></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={av.card} alt={av.name} style={s("position: relative; display: block; height: min(60vh, 600px); max-width: 90vw; width: auto; filter: drop-shadow(0 30px 60px rgba(0,0,0,0.6)); animation: ri-card-float 6s ease-in-out infinite;")} />
                <div ref={glareRef} style={s("position: absolute; inset: 0; border-radius: 18px; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.28), transparent 45%); opacity: 0; pointer-events: none; transition: opacity .3s ease;")}></div>
              </div>
            </div>
          ) : (
            /* FALLBACK: pulsing emblem + decoded name */
            <>
              <div style={s("position: relative; width: clamp(120px, 18vh, 170px); height: clamp(120px, 18vh, 170px); margin: 0 auto clamp(18px, 3vh, 30px);")}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${heroColor}`, opacity: 0.4, animation: "ri-ring 2.4s ease-out infinite" }}></span>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${heroColor}`, opacity: 0.4, animation: "ri-ring 2.4s ease-out infinite 1.2s" }}></span>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 50% 42%, rgba(30,12,20,0.9), rgba(8,6,14,0.95))", display: "flex", alignItems: "center", justifyContent: "center", "--gl": heroGlow, animation: "ri-emblem 3.4s ease-in-out infinite" }}>
                  <svg viewBox="0 0 100 100" style={{ width: "58%", height: "58%" }} fill="none" stroke={heroColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="50" cy="44" rx="9" ry="12" /><path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" /></svg>
                </div>
              </div>
              <div style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 6px;")}>You are</div>
              <h1 style={{ margin: 0, fontFamily: "'Oswald', sans-serif", fontSize: "clamp(40px, 8vw, 96px)", lineHeight: 0.95, fontWeight: 600, textTransform: "uppercase", color: heroColor, textShadow: `0 0 50px ${heroGlow}`, animation: "ri-decode 1s cubic-bezier(.16,.84,.3,1) both" }}>{av.name}</h1>
              {av.tagline && <p style={s("margin: 12px 0 0; font-style: italic; font-size: 15px; letter-spacing: 0.04em; color: rgba(226,226,240,0.62);")}>{av.tagline}</p>}
              {av.description && <p style={s("margin: clamp(14px, 2.4vh, 24px) auto 0; max-width: 540px; font-size: clamp(14px, 1.5vw, 18px); line-height: 1.6; color: rgba(226,226,240,0.82); text-wrap: pretty;")}>{av.description}</p>}
            </>
          )}

          {/* CTAs: twins + retake (+ forum) */}
          <div style={s("display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: wrap; margin-top: clamp(22px, 3.4vh, 36px);")}>
            <button onClick={goToTwins} data-web-hover="true" className="ri-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
              <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
                <span style={s("position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 10px; padding: 15px 34px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase;")}><span className="ri-sheen"></span>Meet Your Web Twins →</span>
              </span>
            </button>
            <button onClick={startRetake} data-web-hover="true" className="ri-ghost" style={s("border: 1px solid rgba(255,255,255,0.2); background: transparent; cursor: pointer; padding: 15px 30px; clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: rgba(255,255,255,0.8); font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase; transition: color .2s ease, border-color .2s ease;")}>Retake</button>
          </div>
          <button onClick={enterForum} disabled={saving} data-web-hover="true" className="link-hover-red" style={s(`margin-top: 20px; ${GHOST_LINK}`)}>{saving ? "Swinging in…" : "Enter the Forum ›"}</button>
          {saveErr && <p style={s(ERR_LINE)}>{saveErr}</p>}
        </div>
      </>
    );
  }

  // ---- questions flow ----
  if (qErr) {
    return shell(
      <>
        <Eyebrow centered>Avatar Experience</Eyebrow>
        <p style={s(ERR_LINE)}>{qErr}</p>
      </>
    );
  }

  if (!questions) {
    return shell(
      <div style={s("font-family: 'Oswald', sans-serif; font-size: 30px; letter-spacing: 0.3em; color: rgba(255,255,255,0.4);")}>…</div>
    );
  }

  if (!questions.length) {
    return shell(
      <>
        <Eyebrow centered>Avatar Experience</Eyebrow>
        <p style={s(ERR_LINE)}>The quiz isn&apos;t available right now. Check back soon.</p>
      </>
    );
  }

  if (submitting) {
    return shell(
      <div style={s("animation: ri-rise 520ms cubic-bezier(.2,.7,.2,1) both; text-align: center;")}>
        <div style={s("font-size: 44px; line-height: 1; margin-bottom: 16px;")}>🕸️</div>
        <span style={s(EYEBROW)}>Reading your web signature…</span>
      </div>
    );
  }

  const q = questions[idx];

  return shell(
    <>
      {/* roaming scan sheen while scanning */}
      <div style={s("position: fixed; left: 0; right: 0; height: 32%; z-index: 0; background: linear-gradient(180deg, transparent, rgba(120,150,255,0.05), transparent); mix-blend-mode: screen; pointer-events: none; animation: ri-scanline-bg 9s ease-in-out infinite;")}></div>

      {/* HUD progress */}
      <div className="ri-progress-wrap" style={s("display: flex; align-items: center; gap: 14px; margin-bottom: clamp(20px, 4vh, 40px);")}>
        <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: #ff6b79;")}>Identity Scan</span>
        <div style={s("display: flex; gap: 7px;")}>
          {questions.map((_, i) => (
            <span key={i} style={{ width: 26, height: 4, borderRadius: 2, background: i <= idx ? "#ff2f40" : "rgba(255,255,255,0.14)", boxShadow: i <= idx ? "0 0 8px rgba(255,47,64,0.7)" : "none", transition: "background .3s ease" }}></span>
          ))}
        </div>
        <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.2em; color: rgba(255,255,255,0.5);")}>{idx + 1} / {total}</span>
      </div>

      {/* question — keyed so the entrance animations replay per question */}
      <div key={q.id} style={s("width: 100%; max-width: 760px;")}>
        <h2 className="ri-anim-q" style={s("margin: 0 0 clamp(22px, 4vh, 40px); font-family: 'Oswald', sans-serif; font-size: clamp(26px, 4vw, 50px); line-height: 1.05; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6); text-wrap: balance;")}>{q.text}</h2>
        <div style={s("display: flex; flex-direction: column; gap: clamp(10px, 1.6vh, 16px);")}>
          {(q.options || []).map((opt, i) => {
            const selected = answers[q.id] === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => pick(q, opt.id)}
                data-web-hover="true"
                className="ri-opt ri-anim-o"
                style={{
                  animationDelay: `${140 + i * 90}ms`,
                  position: "relative", textAlign: "left",
                  border: `1px solid ${selected ? "rgba(255,60,74,0.7)" : "rgba(255,255,255,0.14)"}`,
                  cursor: "pointer",
                  padding: "clamp(15px, 2vh, 20px) clamp(18px, 2.4vw, 26px)",
                  background: selected ? "rgba(255,40,60,0.14)" : "rgba(255,255,255,0.04)",
                  clipPath: "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
                  display: "flex", alignItems: "center", gap: 16, fontFamily: "inherit",
                }}
              >
                <span style={s("flex-shrink: 0; width: 34px; height: 34px; border-radius: 9px; background: rgba(255,40,60,0.12); border: 1px solid rgba(255,60,74,0.35); display: flex; align-items: center; justify-content: center; font-family: 'Oswald', sans-serif; font-size: 14px; font-weight: 600; color: #ff8a96;")}>{OPTION_KEYS[i] || i + 1}</span>
                <span style={s("font-size: clamp(14px, 1.5vw, 17px); line-height: 1.4; color: rgba(240,240,250,0.92); text-wrap: pretty;")}>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {submitErr && <p style={s(ERR_LINE)}>{submitErr}</p>}

        {idx > 0 && (
          <button type="button" onClick={goBack} data-web-hover="true" className="link-hover-red" style={s(`margin-top: 22px; ${GHOST_LINK}`)}>‹ Previous</button>
        )}
      </div>
    </>
  );
}
