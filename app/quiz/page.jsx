"use client";

// The Avatar Experience — the identity quiz. Session-gated; fetches the live
// questions from /api/quiz, auto-advances one question per screen, submits to
// /api/quiz/submit and reveals the assigned Spider identity + Spidey Code.
// Users who already completed the quiz land straight on the reveal screen.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { portalApi } from "@/lib/portal/api";
import { useSession } from "@/components/auth/SessionProvider";

const EYEBROW = "font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;";
const ERR_LINE = "margin: 14px 0 0; font-size: 13px; color: #ff5a6a;";
const GHOST_LINK = "border: 0; background: transparent; cursor: pointer; padding: 0; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55); transition: color .2s ease;";

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

// AuthModal's cut-corner panel, reused for the gate + reveal cards.
function Panel({ children, width = "min(560px, 100%)", delay = 0 }) {
  return (
    <div style={s(`animation: bnd-word-rise 520ms ${delay}ms cubic-bezier(.2,.7,.2,1) both; position: relative; width: ${width}; padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3);`)}>
      <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(30px, 6vw, 44px) clamp(24px, 5vw, 38px); text-align: center;")}>
        {children}
      </div>
    </div>
  );
}

export default function QuizPage() {
  const router = useRouter();
  const { user, loading, refresh, openAuth } = useSession();

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
  const answered = questions ? questions.filter((q) => answers[q.id] != null).length : 0;

  async function submitQuiz(ansMap) {
    setSubmitting(true);
    setSubmitErr("");
    try {
      const payload = questions.map((q) => ({ questionId: q.id, optionId: ansMap[q.id] }));
      const data = await portalApi("/quiz/submit", { method: "POST", body: { answers: payload } });
      setResult({ avatar: data.avatar, spideyCode: data.spideyCode });
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
    setRetake(true);
    setResult(null);
    setQuestions(null);
    setQErr("");
    setAnswers({});
    setIdx(0);
    setSubmitErr("");
  };

  // Location is no longer asked here — country comes from the signup dial code
  // (IP-based enrichment may come later, per client).
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

  const wrap = s("position: relative; min-height: 100vh; overflow: hidden; background-color: #06080f; background-image: radial-gradient(120% 100% at 50% 0%, rgba(11,18,38,0.9) 0%, rgba(7,7,17,0.55) 55%, rgba(4,4,9,0) 100%); color: #fff; font-family: 'Acumin Pro', 'Oswald', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: clamp(28px, 6vh, 72px) clamp(18px, 5vw, 40px);");

  // ---- session loading ----
  if (loading) {
    return (
      <main style={wrap}>
        <div style={s("font-family: 'Oswald', sans-serif; font-size: 30px; letter-spacing: 0.3em; color: rgba(255,255,255,0.4);")}>…</div>
      </main>
    );
  }

  // ---- logged out gate ----
  if (!user) {
    return (
      <main style={wrap}>
        <Panel width="min(440px, 100%)">
          <Eyebrow centered>Members Only</Eyebrow>
          <h1 style={s("margin: 12px 0 0; font-family: 'Oswald', sans-serif; font-size: clamp(26px, 6vw, 34px); line-height: 1; font-weight: 500; text-transform: uppercase; color: #fff;")}>Swing in first</h1>
          <p style={s("margin: 14px auto 24px; max-width: 320px; font-size: 14px; line-height: 1.6; color: rgba(232,232,244,0.7);")}>The Avatar Experience needs a web identity. Log in and we&apos;ll find out who you are under the mask.</p>
          <RedCta onClick={() => openAuth("login")}>Swing In</RedCta>
        </Panel>
      </main>
    );
  }

  // ---- reveal screen ----
  if (reveal) {
    const av = reveal.avatar || {};
    const heroColor = av.color || "#ff3a4a";
    return (
      <main style={wrap}>
        <div style={s("width: min(560px, 100%); display: flex; flex-direction: column; align-items: center;")}>
          <Panel>
            <div style={s("animation: bnd-word-rise 620ms 120ms cubic-bezier(.2,.7,.2,1) both; font-size: 72px; line-height: 1; margin-bottom: 14px;")}>{av.emoji}</div>
            <div style={s("animation: bnd-word-rise 620ms 260ms cubic-bezier(.2,.7,.2,1) both;")}>
              <Eyebrow centered>Your Spider Identity</Eyebrow>
            </div>
            <h1 style={s(`animation: bnd-word-rise 620ms 400ms cubic-bezier(.2,.7,.2,1) both; margin: 10px 0 0; font-family: 'Oswald', sans-serif; font-size: clamp(34px, 7vw, 52px); line-height: 1; font-weight: 500; text-transform: uppercase; color: ${heroColor}; text-shadow: 0 6px 40px rgba(0,0,0,0.7);`)}>{av.name}</h1>
            {av.tagline && <p style={s("animation: bnd-word-rise 620ms 540ms cubic-bezier(.2,.7,.2,1) both; margin: 12px 0 0; font-style: italic; font-size: 15px; letter-spacing: 0.04em; color: rgba(226,226,240,0.62);")}>{av.tagline}</p>}
            {av.description && <p style={s("animation: bnd-word-rise 620ms 680ms cubic-bezier(.2,.7,.2,1) both; margin: 16px auto 0; max-width: 420px; font-size: 14px; line-height: 1.65; color: rgba(232,232,244,0.8);")}>{av.description}</p>}
            {reveal.spideyCode && (
              <div style={s("animation: bnd-word-rise 620ms 820ms cubic-bezier(.2,.7,.2,1) both; display: inline-flex; align-items: center; gap: 12px; margin-top: 24px; padding: 10px 22px; border: 1px solid rgba(255,255,255,0.22); border-radius: 999px; background: rgba(255,255,255,0.05);")}>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.5);")}>Spidey Code</span>
                <span style={s("font-family: 'SF Mono', 'Menlo', monospace; font-size: 14px; letter-spacing: 0.2em; color: #fff;")}>{reveal.spideyCode}</span>
              </div>
            )}
            {reveal.fromProfile && (
              <p style={s("animation: bnd-word-rise 620ms 940ms cubic-bezier(.2,.7,.2,1) both; margin: 20px 0 0;")}>
                <button type="button" onClick={startRetake} data-web-hover="true" className="link-hover-red" style={s(GHOST_LINK)}>Retake the quiz ›</button>
              </p>
            )}
          </Panel>

          {/* enter */}
          <div style={s("animation: bnd-word-rise 620ms 1060ms cubic-bezier(.2,.7,.2,1) both; width: 100%; margin-top: 28px;")}>
            <RedCta onClick={enterForum} disabled={saving}>{saving ? "Swinging in…" : "Enter the Forum"}</RedCta>
            {saveErr && <p style={s(ERR_LINE)}>{saveErr}</p>}
          </div>
        </div>
      </main>
    );
  }

  // ---- questions flow ----
  if (qErr) {
    return (
      <main style={wrap}>
        <Eyebrow centered>Avatar Experience</Eyebrow>
        <p style={s(ERR_LINE)}>{qErr}</p>
      </main>
    );
  }

  if (!questions) {
    return (
      <main style={wrap}>
        <div style={s("font-family: 'Oswald', sans-serif; font-size: 30px; letter-spacing: 0.3em; color: rgba(255,255,255,0.4);")}>…</div>
      </main>
    );
  }

  if (!questions.length) {
    return (
      <main style={wrap}>
        <Eyebrow centered>Avatar Experience</Eyebrow>
        <p style={s(ERR_LINE)}>The quiz isn&apos;t available right now. Check back soon.</p>
      </main>
    );
  }

  if (submitting) {
    return (
      <main style={wrap}>
        <div style={s("animation: bnd-word-rise 520ms cubic-bezier(.2,.7,.2,1) both; text-align: center;")}>
          <div style={s("font-size: 44px; line-height: 1; margin-bottom: 16px;")}>🕸️</div>
          <span style={s(EYEBROW)}>Reading your web signature…</span>
        </div>
      </main>
    );
  }

  const q = questions[idx];

  return (
    <main style={wrap}>
      {/* progress */}
      <div style={s("position: fixed; top: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.08); z-index: 60;")}>
        <div style={s(`height: 100%; width: ${total ? Math.round((answered / total) * 100) : 0}%; background: linear-gradient(90deg, #ff3a4a, #c00014); box-shadow: 0 0 12px rgba(255,58,74,0.7); transition: width .3s ease;`)}></div>
      </div>

      <div key={q.id} style={s("width: min(640px, 100%); display: flex; flex-direction: column; align-items: stretch;")}>
        <div style={s("animation: bnd-word-rise 420ms cubic-bezier(.2,.7,.2,1) both; margin-bottom: 14px;")}>
          <Eyebrow>Question {idx + 1} of {total}</Eyebrow>
        </div>
        <h1 style={s("animation: bnd-word-rise 480ms 60ms cubic-bezier(.2,.7,.2,1) both; margin: 0 0 28px; font-family: 'Oswald', sans-serif; font-size: clamp(26px, 4.6vw, 46px); line-height: 1.08; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 40px rgba(0,0,0,0.7); text-wrap: balance;")}>{q.text}</h1>

        <div style={s("display: flex; flex-direction: column; gap: 10px;")}>
          {(q.options || []).map((opt, i) => {
            const selected = answers[q.id] === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => pick(q, opt.id)}
                data-web-hover="true"
                style={s(`animation: bnd-word-rise 420ms ${140 + i * 70}ms cubic-bezier(.2,.7,.2,1) both; width: 100%; box-sizing: border-box; text-align: left; cursor: pointer; border: 1px solid ${selected ? "#ff3a4a" : "rgba(255,255,255,0.14)"}; border-radius: 12px; padding: 16px; background: ${selected ? "rgba(255,40,60,0.08)" : "rgba(255,255,255,0.06)"}; color: #fff; font-family: inherit; font-size: 15px; line-height: 1.45; transition: border-color .2s ease, background .2s ease;`)}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {submitErr && <p style={s(ERR_LINE)}>{submitErr}</p>}

        {idx > 0 && (
          <button type="button" onClick={goBack} data-web-hover="true" className="link-hover-red" style={s(`margin-top: 24px; align-self: flex-start; ${GHOST_LINK}`)}>‹ Previous</button>
        )}
      </div>
    </main>
  );
}
