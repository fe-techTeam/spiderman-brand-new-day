"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { s } from "@/lib/style";
import { portalApi } from "@/lib/portal/api";

// Quick-fill suggestions — tapping one seeds the reason box; the fan can edit.
const PRESETS = [
  "Spam or misleading",
  "Harassment or hate",
  "Spoiler not tagged",
  "Sexual or explicit content",
  "Violence or threats",
  "Other",
];

const FlagIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

/**
 * Report trigger + modal for a post or comment/reply.
 *   entityType: "post" | "comment"
 *   entityId:   number
 *   variant:    "pill" (feed/detail action row) | "inline" (comment meta row)
 *   stop:       stopPropagation on the trigger (feed cards navigate on click)
 */
export default function ReportControl({ entityType, entityId, variant = "pill", stop = false }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false); // submitted (or already reported)
  const [mounted, setMounted] = useState(false); // portal target only exists client-side

  useEffect(() => setMounted(true), []);

  const label = entityType === "post" ? "post" : "comment";

  const openModal = (e) => {
    if (stop) e.stopPropagation();
    setReason("");
    setError("");
    setDone(false);
    setOpen(true);
  };
  const close = (e) => {
    if (e && stop) e.stopPropagation();
    setOpen(false);
  };

  const submit = async () => {
    const text = reason.trim();
    if (text.length < 3) {
      setError("Please tell us a little more (a few words).");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const path =
        entityType === "post"
          ? `/forum/posts/${entityId}/report`
          : `/forum/comments/${entityId}/report`;
      await portalApi(path, { method: "POST", body: { reason: text } });
      setDone(true);
    } catch (err) {
      // Already reported is a soft outcome — treat it as a friendly "done".
      if (err.code === "already_reported") {
        setDone(true);
      } else {
        setError(err.message || "Couldn't submit your report. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const trigger =
    variant === "inline" ? (
      <button
        onClick={openModal}
        data-web-hover="true"
        style={s("display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5); padding: 0;")}
      >
        <FlagIcon size={12} />
        Report
      </button>
    ) : (
      <button
        onClick={openModal}
        data-web-hover="true"
        style={s("display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,0.05); border: 0; font-size: 12px; color: rgba(255,255,255,0.7); cursor: pointer; font-family: inherit;")}
      >
        <FlagIcon size={14} />
        Report
      </button>
    );

  // Portaled to <body> so an ancestor's clip-path / transform (the forum cards
  // use both) can't clip or mis-position the fixed overlay.
  const modal = (
    <div
      onClick={close}
      style={s("position: fixed; inset: 0; z-index: 95; background: rgba(4,4,10,0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fm-rise .3s ease both;")}
    >
          <div
            onClick={(e) => e.stopPropagation()}
            style={s("position: relative; width: min(460px, 100%); padding: 2px; background: linear-gradient(150deg, #ff2233, #8b000d); clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px); box-shadow: 0 40px 100px rgba(0,0,0,0.6);")}
          >
            <div style={s("background: linear-gradient(150deg, rgba(18,12,20,0.98), rgba(9,8,14,0.99)); clip-path: polygon(21px 0, 100% 0, 100% calc(100% - 21px), calc(100% - 21px) 100%, 0 100%, 0 21px); padding: 28px 30px;")}>
              {done ? (
                <div style={s("text-align: center; padding: 8px 0 4px;")}>
                  <div style={s("width: 54px; height: 54px; margin: 0 auto 16px; border-radius: 50%; background: rgba(255,40,60,0.12); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center; color: #ff8a95;")}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <h3 style={s("font-size: 20px; color: #fff; margin-bottom: 8px;")}>Thanks for the heads-up</h3>
                  <p style={s("margin: 0 0 22px; font-size: 13.5px; line-height: 1.6; color: rgba(226,226,240,0.7);")}>
                    This {label} has been submitted to our moderators for review. We appreciate you
                    helping keep the Web safe.
                  </p>
                  <button
                    onClick={close}
                    data-web-hover="true"
                    className="fm-cta"
                    style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}
                  >
                    <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);")}>
                      <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 11px 30px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.14em; text-transform: uppercase;")}><span className="fm-sheen"></span>Done</span>
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  <h3 style={s("display: flex; align-items: center; gap: 9px; font-size: 20px; color: #fff; margin-bottom: 6px;")}>
                    <span style={s("color: #ff5a6a;")}><FlagIcon size={18} /></span>
                    Report this {label}
                  </h3>
                  <p style={s("margin: 0 0 18px; font-size: 13px; line-height: 1.55; color: rgba(226,226,240,0.6);")}>
                    Let our moderators know what&apos;s wrong. Your report is anonymous to the author.
                  </p>

                  <div style={s("display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;")}>
                    {PRESETS.map((p) => {
                      const active = reason.trim() === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setReason(p); setError(""); }}
                          data-web-hover="true"
                          style={s(`border: 1px solid ${active ? "rgba(255,60,74,0.6)" : "rgba(255,255,255,0.16)"}; background: ${active ? "rgba(255,40,60,0.14)" : "rgba(255,255,255,0.04)"}; color: ${active ? "#ff8a95" : "rgba(255,255,255,0.72)"}; cursor: pointer; padding: 7px 13px; border-radius: 999px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; transition: background .18s ease, border-color .18s ease, color .18s ease;`)}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setError(""); }}
                    rows={4}
                    maxLength={500}
                    autoFocus
                    placeholder="Tell us why you're reporting this…"
                    style={s("width: 100%; box-sizing: border-box; resize: none; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; color: #fff; font-family: inherit; font-size: 14px; line-height: 1.5;")}
                  />
                  {error && <div style={s("margin-top: 8px; font-size: 12.5px; color: #ff8a96;")}>{error}</div>}

                  <div style={s("display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;")}>
                    <button
                      onClick={close}
                      data-web-hover="true"
                      style={s("border: 0; background: transparent; color: rgba(255,255,255,0.6); font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; padding: 12px 14px;")}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      disabled={busy}
                      data-web-hover="true"
                      className="fm-cta"
                      style={s(`position: relative; border: 0; padding: 0; background: transparent; cursor: ${busy ? "default" : "pointer"}; opacity: ${busy ? "0.7" : "1"};`)}
                    >
                      <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);")}>
                        <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 12px 26px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.14em; text-transform: uppercase;")}><span className="fm-sheen"></span>{busy ? "Submitting…" : "Submit report"}</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
  );

  return (
    <>
      {trigger}
      {open && mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
