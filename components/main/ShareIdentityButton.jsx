"use client";

// The "Share" (your identity) button — quiz reveal + The Living Web panel.
// Native share (card image + caption with the link) wherever the platform can
// do it; otherwise a small in-house sheet: WhatsApp, copy message, download
// card, native "more". The label stays "Share" at all times (client request —
// no swap feedback). The sheet portals to <body> — the host screens animate
// transforms, which would turn position:fixed into a local containing block.
// onOpenChange lets the landing page pause its section pager while the sheet
// is up, the same way it does for its other overlays.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { s } from "@/lib/style";
import { buildBestShareFile, fetchShareTemplate, identityShareText, logShare, shareIdentity } from "@/lib/share-identity";

const ROW =
  "width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-top: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.92); font-family: 'Oswald', sans-serif; font-size: 12.5px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; text-align: left; transition: border-color .2s ease, background .2s ease;";

function ShareIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#25d366" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

export default function ShareIdentityButton({ avatar, spideyCode, variant = "reveal", onSfx, onOpenChange, style: styleOverride }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const templateRef = useRef(null); // admin-managed message template
  const busyRef = useRef(false);

  const setSheet = (open) => {
    setSheetOpen(open);
    onOpenChange && onOpenChange(open);
  };

  /* pre-compose the 1080×1080 share card — iOS wants share() inside the
     tap's activation window, and the reveal <img> already warmed the cache */
  useEffect(() => {
    let on = true;
    fileRef.current = null;
    if (avatar && avatar.card) {
      buildBestShareFile(avatar, spideyCode)
        .then((f) => {
          if (on) fileRef.current = f;
        })
        .catch(() => {});
    }
    fetchShareTemplate().then((t) => {
      if (on) templateRef.current = t;
    });
    return () => {
      on = false;
    };
  }, [avatar && avatar.card, spideyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSheet(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  const onShare = async () => {
    if (busyRef.current) return;
    onSfx && onSfx();
    logShare(); // every click is a row in the shares log, repeats included
    busyRef.current = true;
    setBusy(true);
    try {
      let file = fileRef.current;
      if (!file && avatar && avatar.card) {
        // cache-warm rebuild — near-instant when the card is on screen; the
        // timeout keeps a dead network from eating the activation window
        file = await Promise.race([
          buildBestShareFile(avatar, spideyCode).catch(() => null),
          new Promise((r) => setTimeout(() => r(null), 2500)),
        ]);
        if (file) fileRef.current = file;
      }
      const outcome = await shareIdentity(avatar, file, templateRef.current);
      if (outcome === "fallback") setSheet(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // computed per action, not per render — the template ref fills in async
  const shareText = () => identityShareText(avatar, templateRef.current);

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank", "noopener");
    setSheet(false);
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setSheet(false);
    } catch {}
  };

  const downloadCard = () => {
    const composed = fileRef.current;
    const a = document.createElement("a");
    const url = composed ? URL.createObjectURL(composed) : avatar.card;
    a.href = url;
    a.download = composed ? composed.name : `spider-identity-${avatar.slug || "card"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (composed) setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const nativeMore = async () => {
    try {
      await navigator.share({ title: "Spider-Man: Brand New Day", text: shareText() });
      setSheet(false);
    } catch {}
  };

  const label = "Share";
  const busyStyle = busy ? { opacity: 0.75, cursor: "progress" } : null;

  const sheet =
    sheetOpen && typeof document !== "undefined"
      ? createPortal(
          <div role="dialog" aria-modal="true" aria-label="Share your identity" style={s("position: fixed; inset: 0; z-index: 900; display: flex; align-items: center; justify-content: center; padding: 20px;")}>
            <div onClick={() => setSheet(false)} style={s("position: absolute; inset: 0; background: rgba(4,3,8,0.74); backdrop-filter: blur(6px);")}></div>
            <div style={s("position: relative; width: min(360px, 100%); padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px); box-shadow: 0 40px 110px rgba(0,0,0,0.7); animation: ri-rise .4s ease both;")}>
              <div style={s("background: linear-gradient(160deg, rgba(13,13,24,0.98), rgba(7,7,14,0.99)); clip-path: polygon(17px 0, 100% 0, 100% calc(100% - 17px), calc(100% - 17px) 100%, 0 100%, 0 17px); padding: 18px 18px 16px;")}>
                <div style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px;")}>
                  <span style={s("display: inline-flex; align-items: center; gap: 9px;")}>
                    <span style={s("width: 22px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
                    <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #ff6b79;")}>Share Your Identity</span>
                  </span>
                  <button type="button" onClick={() => setSheet(false)} data-web-hover="true" aria-label="Close" style={s("border: 0; background: transparent; cursor: pointer; padding: 4px; color: rgba(255,255,255,0.55); font-size: 16px; line-height: 1;")}>✕</button>
                </div>
                <button type="button" onClick={openWhatsApp} data-web-hover="true" className="lw-share-row" style={s(ROW)}>
                  <WhatsAppIcon />WhatsApp
                </button>
                <button type="button" onClick={copyMessage} data-web-hover="true" className="lw-share-row" style={s(ROW)}>
                  <CopyIcon />Copy Message
                </button>
                {avatar && avatar.card && (
                  <button type="button" onClick={downloadCard} data-web-hover="true" className="lw-share-row" style={s(ROW)}>
                    <DownloadIcon />Download Card
                  </button>
                )}
                {typeof navigator !== "undefined" && !!navigator.share && (
                  <button type="button" onClick={nativeMore} data-web-hover="true" className="lw-share-row" style={s(ROW)}>
                    <ShareIcon size={16} />More Options…
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (variant === "twins") {
    return (
      <>
        <button type="button" onClick={onShare} aria-busy={busy} data-web-hover="true" className="bnd-cta" style={{ ...s("border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;"), ...busyStyle, ...styleOverride }}>
          <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;")}>
            <span className="bnd-cta-sheen"></span>
            <ShareIcon size={13} />
            {label}
          </span>
        </button>
        {sheet}
      </>
    );
  }

  // "reveal" — full-size CTA matching the quiz reward screen buttons
  return (
    <>
      <button type="button" onClick={onShare} aria-busy={busy} data-web-hover="true" className="ri-cta" style={{ ...s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;"), ...busyStyle, ...styleOverride }}>
        <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
          <span style={s("position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 10px; padding: 15px 34px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase;")}>
            <span className="ri-sheen"></span>
            <ShareIcon />
            {label}
          </span>
        </span>
      </button>
      {sheet}
    </>
  );
}
