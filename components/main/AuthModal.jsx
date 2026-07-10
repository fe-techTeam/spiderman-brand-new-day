/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { s } from "@/lib/style";
import { portalApi } from "@/lib/portal/api";
import { dismissKeyboard } from "@/lib/dismissKeyboard";
import PasswordField from "@/components/main/PasswordField";

// Register / Login popup rendered globally by SessionProvider. Calls the real
// auth APIs; per-field validation errors from err.fields render under the
// matching inputs. Fields: register = Username, Email, Password (mobile is
// backend-only now — country comes from the signup IP); login = Email,
// Password. A minimal "forgot password" body swaps in from login.
const FIELD = "width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 15px;";
const LABEL = "display: block; margin-bottom: 6px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55);";
const FIELD_ERR = "font-size: 12px; color: #ff6b79; margin-top: 4px;";

const Tab = ({ id, label, mode, onSelect }) => {
  const active = mode === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      data-web-hover="true"
      style={s(`flex: 1; border: 0; cursor: pointer; padding: 11px 8px; background: ${active ? "linear-gradient(180deg, #ff3a4a, #c00014)" : "transparent"}; color: ${active ? "#fff" : "rgba(255,255,255,0.6)"}; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; border-radius: 9px; transition: background .2s ease, color .2s ease;`)}
    >
      {label}
    </button>
  );
};

export default function AuthModal({ initialMode = "register", onClose, onAuthed }) {
  const [mode, setMode] = useState(initialMode); // "register" | "login" | "forgot"
  const [form, setForm] = useState({
    username: "",
    email: "",
    identifier: "", // login accepts email OR username
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const isReg = mode === "register";
  const isForgot = mode === "forgot";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const swapMode = (m) => {
    setMode(m);
    setFieldErrors({});
    setError("");
    setForgotMsg("");
    setResetUrl("");
  };

  // Escape closes (the page-level handler used to do this before the modal went global).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Client-side mirror of the server rules (lib/server/validate.js) so users
  // get instant feedback; the server remains the source of truth.
  const validateClient = () => {
    const errs = {};
    if (isReg) {
      if (!/^[a-z0-9_]{3,30}$/.test(form.username.trim().toLowerCase())) {
        errs.username = "3–30 characters: letters, numbers, underscores";
      }
    }
    if (!isForgot) {
      const pw = form.password;
      if (isReg && (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw))) {
        errs.password = "8+ characters with at least one letter and one number";
      }
    }
    if (isReg || isForgot) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errs.email = "Enter a valid email";
      }
    } else if (form.identifier.trim().length < 3) {
      errs.identifier = "Enter your email or username";
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length) {
      setFieldErrors(clientErrs);
      setError("");
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    setError("");
    dismissKeyboard(); // drop the keyboard once the form is validated & sending
    try {
      if (isForgot) {
        const data = await portalApi("/auth/forgot-password", { method: "POST", body: { email: form.email } });
        setForgotMsg(data.message || "If that email is registered, a reset link is on its way.");
        setResetUrl(data.resetUrl || "");
      } else if (isReg) {
        const result = await portalApi("/auth/signup", {
          method: "POST",
          body: {
            username: form.username,
            email: form.email,
            password: form.password,
          },
        });
        onAuthed(result);
      } else {
        const result = await portalApi("/auth/login", {
          method: "POST",
          body: { identifier: form.identifier, password: form.password },
        });
        onAuthed(result);
      }
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setFieldErrors(err.fields);
      else setError(err.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (name) =>
    fieldErrors[name] ? <div style={s(FIELD_ERR)}>{fieldErrors[name]}</div> : null;

  const ctaLabel = isForgot
    ? (submitting ? "Sending…" : "Send Reset Link")
    : isReg
      ? (submitting ? "Creating…" : "Create Account")
      : (submitting ? "Logging in…" : "Log In");

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
          <h2 style={s("margin: 0 0 20px; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 6vw, 32px); line-height: 1; font-weight: 500; text-transform: uppercase; color: #fff;")}>{isForgot ? "Reset Your Password" : isReg ? "Join the Spider World" : "Welcome Back"}</h2>

          {/* tabs */}
          {!isForgot && (
            <div style={s("display: flex; gap: 6px; padding: 5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 22px;")}>
              <Tab id="register" label="Sign Up" mode={mode} onSelect={swapMode} />
              <Tab id="login" label="Log In" mode={mode} onSelect={swapMode} />
            </div>
          )}

          {/* fields */}
          {isForgot ? (
            <>
              <p style={s("margin: 0 0 18px; font-size: 13.5px; line-height: 1.55; color: rgba(226,226,240,0.7);")}>Enter your email and we&apos;ll send you a link to reset your password.</p>
              <div style={s("margin-bottom: 22px;")}>
                <label style={s(LABEL)}>Email</label>
                <input value={form.email} onChange={set("email")} type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com" required style={s(FIELD)} />
                {fieldError("email")}
              </div>
              {forgotMsg && (
                <p style={s("margin: 0 0 18px; font-size: 13px; line-height: 1.55; color: rgba(226,226,240,0.8);")}>
                  {forgotMsg}
                  {resetUrl && (
                    <>
                      <br />
                      <a href={resetUrl} data-web-hover="true" style={s("color: #ff5a6a; word-break: break-all;")}>{resetUrl}</a>
                    </>
                  )}
                </p>
              )}
            </>
          ) : (
            <>
              {isReg && (
                <div style={s("margin-bottom: 14px;")}>
                  <label style={s(LABEL)}>Username</label>
                  <input value={form.username} onChange={set("username")} type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="your_web_handle" required style={s(FIELD)} />
                  {fieldError("username")}
                </div>
              )}
              {isReg ? (
                <div style={s("margin-bottom: 14px;")}>
                  <label style={s(LABEL)}>Email</label>
                  <input value={form.email} onChange={set("email")} type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com" required style={s(FIELD)} />
                  {fieldError("email")}
                </div>
              ) : (
                <div style={s("margin-bottom: 14px;")}>
                  <label style={s(LABEL)}>Email or Username</label>
                  <input value={form.identifier} onChange={set("identifier")} type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com or your_web_handle" required style={s(FIELD)} />
                  {fieldError("identifier")}
                </div>
              )}
              <div style={s("margin-bottom: 22px;")}>
                <label style={s(LABEL)}>Password</label>
                <PasswordField value={form.password} onChange={set("password")} autoComplete={isReg ? "new-password" : "current-password"} placeholder="••••••••" required style={s(FIELD)} />
                {fieldError("password")}
                {!isReg && (
                  <div style={s("margin-top: 8px; text-align: right;")}>
                    <button type="button" onClick={() => swapMode("forgot")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: rgba(226,226,240,0.6); font-size: 12px; padding: 0; font-family: inherit;")}>Forgot password?</button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* general error */}
          {error && <p style={s("margin: 0 0 14px; font-size: 12px; color: #ff6b79;")}>{error}</p>}

          {/* submit */}
          <button type="submit" disabled={submitting} data-web-hover="true" className="bnd-cta" style={s(`width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: ${submitting ? "default" : "pointer"}; opacity: ${submitting ? "0.7" : "1"}; font-family: inherit;`)}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
              <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 15px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>{ctaLabel}</span>
            </span>
          </button>

          {/* toggle line */}
          <p style={s("margin: 18px 0 0; text-align: center; font-size: 13px; color: rgba(226,226,240,0.6);")}>
            {isForgot ? (
              <button type="button" onClick={() => swapMode("login")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font: inherit; padding: 0;")}>‹ Back to log in</button>
            ) : (
              <>
                {isReg ? "Already swinging with us? " : "New to the Web? "}
                <button type="button" onClick={() => swapMode(isReg ? "login" : "register")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font: inherit; padding: 0;")}>
                  {isReg ? "Log in" : "Sign up"}
                </button>
              </>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
