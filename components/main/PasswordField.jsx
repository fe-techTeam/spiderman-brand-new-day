"use client";

import { useState } from "react";
import { s } from "@/lib/style";

// Drop-in replacement for the portal's inline-styled `<input type="password">`
// that adds a show/hide eye toggle (AuthModal login/register + reset-password).
// Pass the same `style` object (s(FIELD)) the raw input used — the wrapper is
// invisible, the input keeps the caller's look and just cedes right padding to
// the eye. The button is type="button" so it can never submit the form, and
// stays a real focus stop (aria-pressed announces the state).
export default function PasswordField({ style, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <span style={s("position: relative; display: block;")}>
      <input {...props} type={show ? "text" : "password"} style={{ ...style, paddingRight: "46px" }} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        data-web-hover="true"
        className="link-hover-red"
        style={s("position: absolute; top: 0; bottom: 0; right: 0; width: 44px; display: flex; align-items: center; justify-content: center; border: 0; background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; padding: 0; transition: color 200ms ease;")}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.4 10.4 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a19.9 19.9 0 0 1-3.22 4.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
