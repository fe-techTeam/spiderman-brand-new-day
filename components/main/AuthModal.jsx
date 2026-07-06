/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { s } from "@/lib/style";

// Register / Login popup opened by "SWING IN" (and the join CTAs). Phase 1 is
// UI-only — no backend — so submit just validates presence and closes. Fields:
// register = Username, Email, Mobile, Password; login = Email, Password.
const FIELD = "width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 15px;";
const LABEL = "display: block; margin-bottom: 6px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55);";

export default function AuthModal({ onClose, onHover }) {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ username: "", email: "", mobile: "", password: "" });
  const isReg = mode === "register";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    // Phase 1: no backend. Just close (fields are marked required for basic UX).
    onClose();
  };

  const Tab = ({ id, label }) => {
    const active = mode === id;
    return (
      <button
        type="button"
        onClick={() => setMode(id)}
        onMouseEnter={onHover}
        data-web-hover="true"
        style={s(`flex: 1; border: 0; cursor: pointer; padding: 11px 8px; background: ${active ? "linear-gradient(180deg, #ff3a4a, #c00014)" : "transparent"}; color: ${active ? "#fff" : "rgba(255,255,255,0.6)"}; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; border-radius: 9px; transition: background .2s ease, color .2s ease;`)}
      >
        {label}
      </button>
    );
  };

  return (
    <div onClick={onClose} style={s("position: fixed; inset: 0; z-index: 110; background: rgba(4,4,10,0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: clamp(16px, 4vw, 32px); animation: bnd-word-rise 320ms cubic-bezier(.2,.7,.2,1) both;")}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={s("position: relative; width: min(440px, 100%); max-height: 92vh; overflow-y: auto; padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3);")}
      >
        <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(26px, 5vw, 36px) clamp(24px, 5vw, 34px) clamp(28px, 5vw, 34px);")}>
          <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -40px; right: -40px; width: 220px; opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />

          {/* close */}
          <button type="button" onClick={onClose} aria-label="Close" style={s("position: absolute; top: 12px; right: 14px; z-index: 5; width: 32px; height: 32px; border: 0; background: transparent; color: rgba(255,255,255,0.6); font-size: 22px; cursor: pointer; line-height: 1;")}>×</button>

          {/* header */}
          <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 8px;")}>
            <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>Swing In</span>
          </div>
          <h2 style={s("margin: 0 0 20px; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 6vw, 32px); line-height: 1; font-weight: 500; text-transform: uppercase; color: #fff;")}>{isReg ? "Join the Spider-Verse" : "Welcome Back"}</h2>

          {/* tabs */}
          <div style={s("display: flex; gap: 6px; padding: 5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 22px;")}>
            <Tab id="register" label="Sign Up" />
            <Tab id="login" label="Log In" />
          </div>

          {/* fields */}
          {isReg && (
            <div style={s("margin-bottom: 14px;")}>
              <label style={s(LABEL)}>Username</label>
              <input value={form.username} onChange={set("username")} type="text" autoComplete="username" placeholder="your_web_handle" required style={s(FIELD)} />
            </div>
          )}
          <div style={s("margin-bottom: 14px;")}>
            <label style={s(LABEL)}>Email</label>
            <input value={form.email} onChange={set("email")} type="email" autoComplete="email" placeholder="you@example.com" required style={s(FIELD)} />
          </div>
          {isReg && (
            <div style={s("margin-bottom: 14px;")}>
              <label style={s(LABEL)}>Mobile</label>
              <input value={form.mobile} onChange={set("mobile")} type="tel" autoComplete="tel" placeholder="+1 555 000 1234" required style={s(FIELD)} />
            </div>
          )}
          <div style={s("margin-bottom: 22px;")}>
            <label style={s(LABEL)}>Password</label>
            <input value={form.password} onChange={set("password")} type="password" autoComplete={isReg ? "new-password" : "current-password"} placeholder="••••••••" required style={s(FIELD)} />
          </div>

          {/* submit */}
          <button type="submit" onMouseEnter={onHover} data-web-hover="true" className="bnd-cta" style={s("width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
              <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 15px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>{isReg ? "Create Account" : "Log In"}</span>
            </span>
          </button>

          {/* toggle line */}
          <p style={s("margin: 18px 0 0; text-align: center; font-size: 13px; color: rgba(226,226,240,0.6);")}>
            {isReg ? "Already swinging with us? " : "New to the Web? "}
            <button type="button" onClick={() => setMode(isReg ? "login" : "register")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font: inherit; padding: 0;")}>
              {isReg ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
