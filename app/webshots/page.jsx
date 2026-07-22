/* eslint-disable @next/next/no-img-element */
"use client";

// Webshots — the members-only media wall (photos & videos, no likes, no
// comments; just the media, who dropped it and when). Every visit gets its
// own random order (seed lives in the opaque cursor, see /api/live-feed).
// Admin posts show as "Spidey Admin" (or a credited author); member uploads
// (when the admin toggle is ON) queue for review, tracked in the "Your drops"
// strip.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { useSession } from "@/components/auth/SessionProvider";
import { portalApi } from "@/lib/portal/api";
import { relTime } from "@/lib/time";
import WebshotsReel from "@/components/live-feed/WebshotsReel";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_PENDING = 5; // mirrors MAX_PENDING_PER_USER in /api/live-feed
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const PAGE_SIZE = 18;

const FIELD = "width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 15px;";
const LABEL = "display: block; margin-bottom: 6px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55);";

const STATUS = {
  pending: { label: "Pending", color: "#ffd23f", bg: "rgba(255,210,63,0.12)", border: "rgba(255,210,63,0.35)" },
  approved: { label: "Live", color: "#7ee787", bg: "rgba(126,231,135,0.12)", border: "rgba(126,231,135,0.35)" },
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

// Members-only gate (ForumGate pattern) — the page unlocks in place after
// the auth modal refreshes the session, so the deep link keeps working.
function WebshotsGate({ onJoin, onLogin }) {
  return (
    <div style={s("position: relative; z-index: 2; min-height: calc(100vh - 220px); display: flex; align-items: center; justify-content: center; padding: clamp(10px, 2.5vh, 28px) clamp(18px, 5vw, 40px) clamp(28px, 6vh, 64px);")}>
      <div style={s("position: relative; width: min(520px, 100%); padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3); animation: fm-rise .5s cubic-bezier(.16,.84,.3,1) both;")}>
        <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(32px, 6vw, 46px) clamp(24px, 5vw, 40px); text-align: center; overflow: hidden;")}>
          <img src="/assets/web.png" alt="" style={s("position: absolute; top: -50px; right: -60px; width: 240px; opacity: 0.07; mix-blend-mode: screen; pointer-events: none;")} />

          <div style={s("position: relative; width: 74px; height: 74px; margin: 0 auto 18px; border-radius: 50%; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.45); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 22px rgba(0,0,0,0.6), 0 0 26px rgba(255,40,60,0.25);")}>
            <span style={s("position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(255,60,74,0.35); animation: bnd-radar-ring 2.8s ease-out infinite;")}></span>
            {/* the site's spider (same art as the cursor), not a generic one */}
            <img src="/assets/cursor-spider-red.svg" alt="" style={s("width: 68%; height: 68%; display: block;")} />
          </div>

          <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 10px;")}>
            <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>Members Only</span>
            <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, #ff5a6a, transparent);")}></span>
          </div>

          <h1 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(26px, 5.6vw, 36px); line-height: 1.04; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6); text-wrap: balance;")}>Webshots <span style={{ color: "#ff2f40" }}>is behind the mask.</span></h1>
          <p style={s("margin: 14px auto 26px; max-width: 380px; font-size: clamp(13px, 1.5vw, 15px); line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>Get onboarded to step inside — photos and videos from Spidey HQ and fans across the Verse, streaming in live.</p>

          <button onClick={onJoin} data-web-hover="true" className="bnd-cta" style={s("width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
              <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 16px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Get Onboarded</span>
            </span>
          </button>

          <p style={s("margin: 18px 0 0; font-size: 13px; color: rgba(226,226,240,0.6);")}>
            Already swinging with us?{" "}
            <button onClick={onLogin} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font: inherit; padding: 0;")}>Log in</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WebshotsPage() {
  const { user, loading: sessionLoading, openAuth } = useSession();
  const router = useRouter();
  const [feed, setFeed] = useState({ items: [], nextCursor: null });
  const [state, setState] = useState("loading"); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [mine, setMine] = useState(null);

  // upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [fileErr, setFileErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const loadFeed = useCallback(async () => {
    setState("loading");
    try {
      const data = await portalApi(`/live-feed?limit=${PAGE_SIZE}`);
      setFeed({ items: data.items, nextCursor: data.nextCursor });
      setUploadsEnabled(data.uploadsEnabled);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (user) loadFeed(); // the API is members-only — no point fetching logged out
  }, [user, loadFeed]);

  const refreshMine = useCallback(() => {
    portalApi("/me/live-feed")
      .then((data) => setMine(data.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refreshMine();
    else setMine(null);
  }, [user, refreshMine]);

  // Load the next page of the current shuffle cycle. Once the cycle is spent
  // (cursor: null) there's genuinely no more to show — we stop rather than
  // re-spinning a fresh cycle, so the feed reads as a finite set, not an
  // endless one. A brand-new order is only available via the Refresh button.
  const loadMore = useCallback(async () => {
    if (loadingMore || !feed.nextCursor) return;
    setLoadingMore(true);
    try {
      const qs = `&cursor=${encodeURIComponent(feed.nextCursor)}`;
      const data = await portalApi(`/live-feed?limit=${PAGE_SIZE}${qs}`);
      setFeed((f) => ({ items: [...f.items, ...data.items], nextCursor: data.nextCursor }));
      setUploadsEnabled(data.uploadsEnabled);
    } catch {
      // keep the current page; the button stays available to retry
    }
    setLoadingMore(false);
  }, [feed.nextCursor, loadingMore]);

  const openUpload = () => {
    setFile(null);
    setFileErr("");
    setSubmitErr("");
    setUploaded(false);
    setUploadOpen(true);
    refreshMine(); // the modal doubles as the status list for their drops
  };
  const closeUpload = () => setUploadOpen(false);

  // Cancel a drop that hasn't gone live (pending, or rejected to clear it).
  const removeDrop = async (id) => {
    if (removingId) return;
    setRemovingId(id);
    try {
      await portalApi(`/live-feed/${id}`, { method: "DELETE" });
      setMine((list) => (list || []).filter((m) => m.id !== id));
    } catch {
      // leave the row visible; they can retry
    }
    setRemovingId(null);
  };

  const onFile = (e) => {
    const picked = e.target.files && e.target.files[0];
    if (!picked) return;
    const isVideo = picked.type.startsWith("video/");
    const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (picked.size > cap) {
      setFile(null);
      setFileErr(
        isVideo
          ? "That video is over 50MB — trim it and try again."
          : "That image is over 5MB — shrink it and try again."
      );
      e.target.value = "";
      return;
    }
    setFileErr("");
    setFile(picked);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!file) {
      setFileErr("Pick a photo or video to drop.");
      return;
    }
    setSubmitting(true);
    setSubmitErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await portalApi("/live-feed", { method: "POST", formData: fd });
      setUploaded(true);
      refreshMine();
    } catch (err) {
      if (err.code === "uploads_disabled") setUploadsEnabled(false);
      if (err.code === "pending_limit") refreshMine(); // resync — the cap notice takes over
      setSubmitErr(err.message || "Upload failed — try again.");
    }
    setSubmitting(false);
  };

  // The server enforces the same cap (code: pending_limit); this just keeps
  // the modal honest without a round trip.
  const pendingCount = (mine || []).filter((m) => m.status === "pending").length;
  const atPendingCap = pendingCount >= MAX_PENDING;

  // The reel IS the page as soon as there's anything to show — there's no grid
  // landing anymore. Loading/error/empty still render as normal page states.
  const showReel = user && state === "ready" && feed.items.length > 0;

  return (
    <div style={s("position: relative; min-height: 100vh; overflow: hidden; background: radial-gradient(130% 90% at 80% -10%, #1c0512 0%, #0b0713 45%, #06080f 100%); padding: clamp(24px, 4vh, 44px) clamp(18px, 4vw, 48px) 96px;")}>
      <img src="/assets/web.png" alt="" style={s("position: absolute; top: -12%; left: -8%; width: min(720px, 60vw); opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />
      <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -18%; right: -10%; width: min(680px, 56vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none;")} />

      {sessionLoading ? (
        <p style={s("position: relative; z-index: 2; margin: 0; padding: 40vh 0; text-align: center; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.45);")}>Threading the web…</p>
      ) : !user ? (
        <>
          {/* top bar (MJ Wall pattern): logo home-link left, back link right */}
          <header style={s("position: relative; z-index: 3; display: flex; align-items: center; gap: clamp(14px, 2vw, 28px);")}>
            <Link href="/" style={s("display: flex; align-items: center; gap: 12px; text-decoration: none; flex-shrink: 0;")}>
              <img src="/assets/nav-logo.png" alt="Brand New Day" style={s("height: 40px; width: auto; display: block;")} />
            </Link>
            <Link href="/" data-web-hover="true" className="link-hover-red" style={s("margin-left: auto; text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.6); transition: color 200ms ease;")}>‹ Back to Home</Link>
          </header>
          <WebshotsGate onJoin={() => openAuth("register")} onLogin={() => openAuth("login")} />
        </>
      ) : showReel ? (
        // the reel below is the whole experience — nothing renders in-flow here
        null
      ) : (
        <div style={s("position: relative; z-index: 2; max-width: 720px; margin: 0 auto;")}>
          {/* light top bar: logo home-link left, back link right */}
          <header style={s("display: flex; align-items: center; gap: clamp(14px, 2vw, 28px); margin-bottom: clamp(32px, 8vh, 64px);")}>
            <Link href="/" style={s("display: flex; align-items: center; gap: 12px; text-decoration: none; flex-shrink: 0;")}>
              <img src="/assets/nav-logo.png" alt="Brand New Day" style={s("height: 38px; width: auto; display: block;")} />
            </Link>
            <Link href="/" data-web-hover="true" className="link-hover-red" style={s("margin-left: auto; text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.6); transition: color 200ms ease;")}>‹ Back to Home</Link>
          </header>

          {state === "loading" && (
            <p style={s("margin: 0; padding: 48px 0; text-align: center; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.45);")}>Tuning into the web…</p>
          )}

          {state === "error" && (
            <div style={s("padding: 48px 24px; text-align: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px;")}>
              <p style={s("margin: 0 0 14px; font-size: 15px; color: rgba(226,226,240,0.7);")}>The feed slipped out of reach. Give it another shot.</p>
              <button onClick={loadFeed} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; padding: 4px 0;")}>Retry ›</button>
            </div>
          )}

          {state === "ready" && feed.items.length === 0 && (
            <div style={s("position: relative; padding: clamp(56px, 10vh, 90px) 24px; text-align: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; overflow: hidden;")}>
              <img src="/assets/web.png" alt="" style={s("position: absolute; top: -60px; right: -70px; width: 280px; opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />

              {/* spider on a quiet thread — same emblem language as the gate */}
              <div style={s("position: relative; width: 66px; height: 66px; margin: 0 auto 20px; border-radius: 50%; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 0 24px rgba(255,40,60,0.2);")}>
                <span style={s("position: absolute; inset: -7px; border-radius: 50%; border: 1px solid rgba(255,60,74,0.3); animation: bnd-radar-ring 2.8s ease-out infinite;")}></span>
                <img src="/assets/cursor-spider-red.svg" alt="" style={s("width: 66%; height: 66%; display: block; opacity: 0.9;")} />
              </div>

              <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 10px;")}>
                <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>No drops yet</span>
                <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, #ff5a6a, transparent);")}></span>
              </div>

              <h2 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(20px, 3.4vw, 28px); line-height: 1.1; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,0.6);")}>The web&apos;s quiet… <span style={{ color: "#ff2f40" }}>too quiet.</span></h2>
              <p style={s("margin: 12px auto 0; max-width: 380px; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.65); text-wrap: pretty;")}>First drops from Spidey HQ are on their way — swing back soon.</p>

              {uploadsEnabled && (
                <button onClick={openUpload} data-web-hover="true" className="bnd-cta" style={s("position: relative; margin-top: 26px; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
                  <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); box-shadow: 0 12px 30px rgba(255,34,51,0.3);")}>
                    <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 10px; padding: 13px 28px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Drop the first one</span>
                  </span>
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* REEL — the default Webshots experience: full-screen vertical swipe.
          Renders as soon as there's anything to show (no grid landing). */}
      {showReel && (
        <WebshotsReel
          items={feed.items}
          hasMore={!!feed.nextCursor}
          loadingMore={loadingMore}
          onNeedMore={loadMore}
          onClose={() => router.push("/")}
          uploadsEnabled={uploadsEnabled}
          onUpload={openUpload}
        />
      )}

      {/* UPLOAD MODAL */}
      {uploadOpen && (
        <div onClick={closeUpload} style={s("position: fixed; inset: 0; z-index: 210; background: rgba(4,4,10,0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: clamp(16px, 4vw, 32px); animation: bnd-word-rise 320ms cubic-bezier(.2,.7,.2,1) both;")}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            style={s("position: relative; width: min(440px, 100%); max-height: 92vh; overflow-y: auto; padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3);")}
          >
            <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(26px, 5vw, 36px) clamp(24px, 5vw, 34px) clamp(28px, 5vw, 34px);")}>
              <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -40px; right: -40px; width: 220px; opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />

              <button type="button" onClick={closeUpload} aria-label="Close" style={s("position: absolute; top: 12px; right: 14px; z-index: 5; width: 32px; height: 32px; border: 0; background: transparent; color: rgba(255,255,255,0.6); font-size: 22px; cursor: pointer; line-height: 1;")}>×</button>

              <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 8px;")}>
                <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>Webshots</span>
              </div>
              <h2 style={s("margin: 0 0 20px; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 6vw, 32px); line-height: 1; font-weight: 500; text-transform: uppercase; color: #fff;")}>Drop yours</h2>

              {uploaded ? (
                <div style={s("display: flex; flex-direction: column; align-items: flex-start; gap: 16px; animation: bnd-word-rise 500ms cubic-bezier(.2,.7,.2,1) both;")}>
                  <div style={s("display: inline-flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 700; color: #fff;")}>
                    <span style={s("width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); color: #6b2a00; display: flex; align-items: center; justify-content: center; font-size: 20px;")}>✓</span>
                    Dropped!
                  </div>
                  <p style={s("margin: 0; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.72);")}>It hits the feed once Spidey HQ approves it — track it under &ldquo;Your drops&rdquo;.</p>
                  <button type="button" onClick={closeUpload} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; padding: 4px 0;")}>Close ›</button>
                </div>
              ) : atPendingCap ? (
                <div style={s("padding: 18px 16px; background: rgba(255,210,63,0.07); border: 1px dashed rgba(255,210,63,0.4); border-radius: 12px;")}>
                  <p style={s("margin: 0 0 6px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #ffd23f;")}>Queue full — {MAX_PENDING} drops in review</p>
                  <p style={s("margin: 0; font-size: 13px; line-height: 1.55; color: rgba(226,226,240,0.72);")}>The web can only hold {MAX_PENDING} of your drops at a time. Remove one below to make room, or hang tight for the verdict.</p>
                </div>
              ) : (
                <>
                  <div style={s("margin-bottom: 22px;")}>
                    <label style={s(LABEL)}>Photo or video</label>
                    <label data-web-hover="true" style={s(FIELD + " display: flex; align-items: center; gap: 10px; cursor: pointer;")}>
                      <input type="file" accept={ACCEPT} onChange={onFile} style={s("display: none;")} />
                      <span style={s(`overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${file ? "#fff" : "rgba(255,255,255,0.45)"};`)}>{file ? file.name : "Choose a photo or video…"}</span>
                    </label>
                    {fileErr && <p style={s("margin: 6px 0 0; font-size: 13px; color: #ff5a6a;")}>{fileErr}</p>}
                  </div>

                  {submitErr && <p style={s("margin: 0 0 14px; font-size: 13px; color: #ff5a6a;")}>{submitErr}</p>}

                  <button type="submit" disabled={submitting} data-web-hover="true" className="bnd-cta" style={s(`width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit; opacity: ${submitting ? "0.7" : "1"};`)}>
                    <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
                      <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 15px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>{submitting ? "Dropping…" : "Drop it on the web"}</span>
                    </span>
                  </button>
                </>
              )}

              {/* your drops — status of what's not on the feed yet; lives here
                  (not on the feed page) so the grid keeps its space */}
              {(() => {
                const drops = (mine || []).filter((m) => m.status === "pending" || m.status === "rejected");
                if (!drops.length) return null;
                return (
                  <div style={s("margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.10);")}>
                    <h3 style={s("margin: 0 0 10px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.55); font-weight: 500;")}>Your drops</h3>
                    <div style={s("display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;")}>
                      {drops.map((m) => (
                        <div key={m.id} style={s("display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 10px; padding: 8px 10px;")}>
                          {m.kind === "video" ? (
                            <video src={m.url} preload="metadata" muted playsInline style={s("flex: 0 0 44px; width: 44px; height: 44px; object-fit: cover; border-radius: 7px; background: #000;")} />
                          ) : (
                            <img src={m.url} alt="Your upload" loading="lazy" style={s("flex: 0 0 44px; width: 44px; height: 44px; object-fit: cover; border-radius: 7px; background: #141018;")} />
                          )}
                          <div style={s("flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;")}>
                            <div style={s("display: flex; align-items: center; gap: 8px; flex-wrap: wrap;")}>
                              <StatusChip status={m.status} />
                              <span style={s("font-size: 11px; color: rgba(255,255,255,0.4); white-space: nowrap;")}>{relTime(m.created_at)}</span>
                            </div>
                            {m.status === "rejected" && m.rejection_reason && (
                              <p style={s("margin: 0; font-size: 11px; line-height: 1.4; color: rgba(255,255,255,0.45); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{m.rejection_reason}</p>
                            )}
                          </div>
                          <button type="button" onClick={() => removeDrop(m.id)} disabled={removingId === m.id} aria-label="Remove this drop" data-web-hover="true" style={s(`flex-shrink: 0; border: 1px solid rgba(255,90,106,0.35); background: transparent; color: #ff5a6a; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; opacity: ${removingId === m.id ? "0.5" : "1"};`)}>
                            {removingId === m.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
