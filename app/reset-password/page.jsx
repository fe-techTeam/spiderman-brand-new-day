/* eslint-disable @next/next/no-img-element */
"use client";

// Reset-password page — reached from the emailed (or dev) reset link with
// ?token=…. Styled to match the AuthModal card.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { s } from "@/lib/style";
import { portalApi } from "@/lib/portal/api";
import { dismissKeyboard } from "@/lib/dismissKeyboard";
import { useSession } from "@/components/auth/SessionProvider";

const FIELD = "width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 15px;";
const LABEL = "display: block; margin-bottom: 6px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55);";

function ResetForm() {
  const router = useRouter();
  const { openAuth } = useSession();
  const token = useSearchParams().get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setSubmitting(true);
    dismissKeyboard(); // hide the mobile keyboard once the reset is submitted
    try {
      const data = await portalApi("/auth/reset-password", { method: "POST", body: { token, password } });
      setMessage(data.message || "Password updated — log in with your new password.");
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      style={s("position: relative; width: min(440px, 100%); padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3);")}
    >
      <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(26px, 5vw, 36px) clamp(24px, 5vw, 34px) clamp(28px, 5vw, 34px);")}>
        <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -40px; right: -40px; width: 220px; opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />

        {/* header */}
        <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 8px;")}>
          <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
          <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>Swing In</span>
        </div>
        <h1 style={s("margin: 0 0 20px; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 6vw, 32px); line-height: 1; font-weight: 500; text-transform: uppercase; color: #fff;")}>Reset Your Password</h1>

        {message ? (
          <>
            <p style={s("margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.8);")}>{message}</p>
            <button
              type="button"
              onClick={() => { router.push("/"); openAuth("login"); }}
              data-web-hover="true"
              className="bnd-cta"
              style={s("width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}
            >
              <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
                <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 15px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Log In</span>
              </span>
            </button>
          </>
        ) : (
          <>
            <div style={s("margin-bottom: 14px;")}>
              <label style={s(LABEL)}>New Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="••••••••" required style={s(FIELD)} />
            </div>
            <div style={s("margin-bottom: 22px;")}>
              <label style={s(LABEL)}>Confirm Password</label>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" autoComplete="new-password" placeholder="••••••••" required style={s(FIELD)} />
            </div>

            {error && <p style={s("margin: 0 0 14px; font-size: 12px; color: #ff6b79;")}>{error}</p>}

            <button type="submit" disabled={submitting} data-web-hover="true" className="bnd-cta" style={s(`width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: ${submitting ? "default" : "pointer"}; opacity: ${submitting ? "0.7" : "1"}; font-family: inherit;`)}>
              <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
                <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 15px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>{submitting ? "Updating…" : "Update Password"}</span>
              </span>
            </button>
          </>
        )}
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={s("min-height: 100vh; background: #06080f; display: flex; align-items: center; justify-content: center; padding: clamp(16px, 4vw, 32px);")}>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
