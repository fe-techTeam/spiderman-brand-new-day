"use client";

/* eslint-disable @next/next/no-img-element */

// Webshots reel — the default full-screen vertical, one-at-a-time viewer for the
// members wall. NOT a Shorts/Reels clone: it leans on native CSS scroll-snap for
// the swipe (robust across touch, trackpad, wheel and keyboard) and
// IntersectionObserver to decide which slide is "live". Videos autoplay LOOPED,
// one at a time, and start with sound (the page ducks the site score while the
// reel is up); if the browser blocks unmuted autoplay it falls back to muted and
// the sound button re-enables audio. Images simply hold until you swipe (no
// surprise auto-advance) with a slow drift so they don't feel dead.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { s } from "@/lib/style";
import { relTime } from "@/lib/time";

// Member handles get "u/"; a credited author or the house account shows as-is
// (same rule as the wall's AuthorChip).
function authorLabel(author) {
  return author.isMember ? `u/${author.name}` : author.name;
}

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

// One reel slide. Self-observes so newly-appended slides wire up without the
// parent re-registering anything. `active` drives playback; `near` gates how
// eagerly the video preloads so we don't buffer the whole feed at once.
function ReelSlide({ item, index, active, near, muted, rootRef, onActivate, onAutoplayBlocked }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const isVideo = item.kind === "video";

  useEffect(() => {
    const el = wrapRef.current;
    const root = rootRef.current;
    if (!el || !root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) onActivate(index);
      },
      { root, threshold: [0.6] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [index, onActivate, rootRef]);

  // Play the live slide, hard-stop every other one (and rewind it, so coming
  // back replays from the top). Autoplay is only allowed while muted — the
  // sound toggle lives on the parent and rides in via `muted`.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (active) {
      const p = v.play();
      if (p && p.catch)
        p.catch(() => {
          // Unmuted autoplay blocked (no prior user activation) → fall back to
          // muted so the clip still runs; the sound button brings audio back.
          if (!muted) onAutoplayBlocked();
        });
    } else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* not seekable yet — harmless */
      }
    }
  }, [active, muted, onAutoplayBlocked]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  };

  return (
    <section
      ref={wrapRef}
      style={s(
        "position: relative; height: 100%; width: 100%; scroll-snap-align: start; scroll-snap-stop: always; flex: 0 0 100%; display: flex; align-items: center; justify-content: center; overflow: hidden;"
      )}
    >
      {/* blurred fill so portrait/oddball media never letterboxes onto dead
          black — cheap for images; videos ride the page's own dark gradient */}
      {!isVideo && (near || active) && (
        <div
          aria-hidden="true"
          style={s(`position: absolute; inset: 0; background-image: url(${item.url}); background-size: cover; background-position: center; filter: blur(46px) brightness(0.5); transform: scale(1.25);`)}
        />
      )}

      {isVideo ? (
        <video
          ref={videoRef}
          src={near || active ? item.url : undefined}
          loop
          playsInline
          muted={muted}
          preload={active ? "auto" : near ? "metadata" : "none"}
          onClick={togglePlay}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          style={s("position: relative; max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; cursor: pointer; background: transparent;")}
        />
      ) : (
        <img
          src={near || active ? item.url : undefined}
          alt={`Dropped by ${item.author.name}`}
          loading="lazy"
          decoding="async"
          style={s(`position: relative; max-height: 100%; max-width: 100%; object-fit: contain; transition: transform 9s ease-out; transform: scale(${active ? 1.07 : 1});`)}
        />
      )}

      {/* paused affordance — video only */}
      {isVideo && paused && active && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          style={s("position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 78px; height: 78px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.85); background: rgba(12,6,10,0.45); backdrop-filter: blur(3px); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;")}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M5 3l16 9-16 9z" /></svg>
        </button>
      )}

      {/* bottom gradient + attribution */}
      <div aria-hidden="true" style={s("position: absolute; inset: auto 0 0 0; height: 42%; background: linear-gradient(to top, rgba(4,3,9,0.82) 0%, rgba(4,3,9,0.35) 45%, transparent 100%); pointer-events: none;")} />
      <div style={s("position: absolute; left: clamp(14px, 5vw, 26px); bottom: clamp(20px, 6vh, 34px); right: clamp(156px, 44vw, 180px); z-index: 2; display: flex; align-items: center; gap: 8px;")}>
        <span style={s("width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.5); display: flex; align-items: center; justify-content: center;")}>
          <img src="/assets/cursor-spider-red.svg" alt="" style={s("width: 60%; height: 60%; display: block;")} />
        </span>
        <div style={s("min-width: 0; display: flex; align-items: baseline; gap: 7px;")}>
          <p style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: 11.5px; letter-spacing: 0.04em; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{authorLabel(item.author)}</p>
          <p style={s("margin: 0; flex-shrink: 0; font-size: 9.5px; color: rgba(255,255,255,0.5);")}>{relTime(item.createdAt)}</p>
        </div>
      </div>
    </section>
  );
}

export default function WebshotsReel({ items, startIndex = 0, hasMore = false, loadingMore = false, onNeedMore, onClose, onRefresh, uploadsEnabled = false, shareEnabled = false, onUpload, escapeToClose = true }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [muted, setMuted] = useState(false); // reel owns the sound; falls back to muted if blocked
  const [showIntro, setShowIntro] = useState(true); // 1s "swipe to watch" cue on open
  const [shareState, setShareState] = useState("idle"); // idle | copied
  const [pull, setPull] = useState(0); // pull-to-refresh distance (px), first slide only
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef({ startY: 0, active: false, dist: 0 });

  const onActivate = useCallback((i) => setActiveIndex(i), []);

  // If the browser refuses unmuted autoplay, drop to muted so playback survives.
  const onAutoplayBlocked = useCallback(() => setMuted(true), []);

  // Share the Webshots page — native sheet on mobile, clipboard elsewhere.
  const doShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/webshots` : "/webshots";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Webshots — Brand New Day", text: "Swing through Webshots", url });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1600);
    } catch {
      /* clipboard blocked — nothing more we can do quietly */
    }
  };

  // Pull-to-refresh — only on the first slide, when the scroller is at the top.
  const onTouchStart = (e) => {
    const el = scrollRef.current;
    if (onRefresh && !refreshing && activeIndex === 0 && el && el.scrollTop <= 0) {
      pullRef.current = { startY: e.touches[0].clientY, active: true, dist: 0 };
    } else {
      pullRef.current.active = false;
    }
  };
  const onTouchMove = (e) => {
    if (!pullRef.current.active) return;
    const el = scrollRef.current;
    const dy = e.touches[0].clientY - pullRef.current.startY;
    if (dy > 0 && el && el.scrollTop <= 0) {
      const d = Math.min(dy * 0.45, 92); // resistance
      pullRef.current.dist = d;
      setPull(d);
    } else {
      pullRef.current.active = false;
      pullRef.current.dist = 0;
      setPull(0);
    }
  };
  const onTouchEnd = async () => {
    if (!pullRef.current.active) return;
    pullRef.current.active = false;
    const dist = pullRef.current.dist;
    pullRef.current.dist = 0;
    if (dist >= 58 && onRefresh && !refreshing) {
      setRefreshing(true);
      setPull(52);
      try {
        await onRefresh();
      } catch {
        /* keep what's on screen */
      }
      const el = scrollRef.current;
      if (el) el.scrollTop = 0;
      setActiveIndex(0);
      setRefreshing(false);
    }
    setPull(0);
  };

  // Jump to the tapped tile before first paint (no scroll-flash from the top).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
  }, [startIndex]);

  // Lock the page behind the reel and duck the site score for its whole life,
  // so the reel's own clips own the sound. MusicPlayer listens for these.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.dispatchEvent(new Event("bnd:reel-open"));
    return () => {
      document.documentElement.style.overflow = prev;
      window.dispatchEvent(new Event("bnd:reel-close"));
    };
  }, []);

  // "Swipe to watch" intro — a gentle ~1s cue on open, then it's gone. Also
  // clears the moment they actually move off the first slide.
  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 1500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (activeIndex !== 0) setShowIntro(false);
  }, [activeIndex]);

  // Pull the next page once you're within a few slides of the end.
  useEffect(() => {
    if (hasMore && !loadingMore && onNeedMore && activeIndex >= items.length - 3) onNeedMore();
  }, [activeIndex, items.length, hasMore, loadingMore, onNeedMore]);

  // Keyboard: arrows step one slide, Escape closes — but only when nothing is
  // layered above the reel (an open upload modal / menu owns Escape instead).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (escapeToClose) onClose();
        return;
      }
      const el = scrollRef.current;
      if (!el) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        el.scrollBy({ top: el.clientHeight, behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        el.scrollBy({ top: -el.clientHeight, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, escapeToClose]);

  const step = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ top: dir * el.clientHeight, behavior: "smooth" });
  };

  return (
    <div style={s("position: fixed; inset: 0; z-index: 200; background: radial-gradient(130% 90% at 80% -10%, #1c0512 0%, #0b0713 45%, #06080f 100%); animation: bnd-word-rise 260ms cubic-bezier(.2,.7,.2,1) both;")}>
      <style>{`.webshots-reel-scroll::-webkit-scrollbar{display:none}
        @keyframes webshots-reel-spin{to{transform:rotate(360deg)}}
        @keyframes webshots-reel-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes webshots-reel-intro{0%{opacity:0;transform:translateY(10px)}22%{opacity:1;transform:translateY(0)}72%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-8px)}}
        @media (hover:hover) and (pointer:fine){.webshots-reel-nav{display:flex !important}}`}</style>

      {/* pull-to-refresh indicator — first slide only, follows the drag. Sits
          below the navbar (which overlays the reel top) so it stays visible. */}
      {(pull > 4 || refreshing) && (
        <div aria-hidden="true" style={s(`position: absolute; top: clamp(74px, 10vh, 98px); left: 50%; z-index: 4; transform: translateX(-50%) translateY(${Math.round(pull)}px); opacity: ${Math.min(pull / 52, 1)}; pointer-events: none;`)}>
          <div style={s("width: 40px; height: 40px; border-radius: 50%; background: rgba(12,8,16,0.7); border: 1px solid rgba(255,60,74,0.4); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; color: #ff6b79;")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: refreshing ? "webshots-reel-spin 0.8s linear infinite" : "none", transform: refreshing ? "none" : `rotate(${Math.round(pull * 3)}deg)` }}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
          </div>
        </div>
      )}

      {/* scroller: the whole swipe surface */}
      <div
        ref={scrollRef}
        className="webshots-reel-scroll"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={s("position: absolute; inset: 0; margin: 0 auto; max-width: min(560px, 100%); height: 100%; overflow-y: scroll; overflow-x: hidden; overscroll-behavior-y: contain; scroll-snap-type: y mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; display: flex; flex-direction: column;")}
      >
        {items.map((item, i) => (
          <ReelSlide
            key={`${item.id}-${i}`}
            item={item}
            index={i}
            active={i === activeIndex}
            near={Math.abs(i - activeIndex) <= 1}
            muted={muted}
            rootRef={scrollRef}
            onActivate={onActivate}
            onAutoplayBlocked={onAutoplayBlocked}
          />
        ))}
        {loadingMore && (
          <div style={s("flex: 0 0 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase;")}>
            Loading more…
          </div>
        )}
      </div>

      {/* action rail: plus · share · mute — small, subtle, bottom-right of the
          media column. Plus only when member uploads are open. */}
      <div style={s("position: absolute; inset: 0; max-width: min(560px, 100%); margin: 0 auto; z-index: 3; pointer-events: none;")}>
        <div style={s("position: absolute; right: clamp(14px, 4vw, 22px); bottom: clamp(18px, 6vh, 32px); display: flex; align-items: center; gap: 9px; pointer-events: none;")}>
          {uploadsEnabled && onUpload && (
            <button type="button" onClick={onUpload} data-web-hover="true" aria-label="Drop yours" style={s("pointer-events: auto; width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,60,74,0.5); background: rgba(20,8,12,0.6); backdrop-filter: blur(6px); color: #ff8a95; display: flex; align-items: center; justify-content: center; cursor: pointer;")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
          {shareEnabled && (
            <button type="button" onClick={doShare} data-web-hover="true" aria-label={shareState === "copied" ? "Link copied" : "Share"} style={s("pointer-events: auto; width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(12,8,16,0.55); backdrop-filter: blur(6px); color: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; cursor: pointer;")}>
              {shareState === "copied" ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7ee787" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
              )}
            </button>
          )}
          <button type="button" onClick={() => setMuted((m) => !m)} data-web-hover="true" aria-label={muted ? "Unmute" : "Mute"} style={s("pointer-events: auto; width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(12,8,16,0.55); backdrop-filter: blur(6px); color: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; cursor: pointer;")}>
            <SpeakerIcon muted={muted} />
          </button>
        </div>
      </div>

      {/* desktop-only step buttons (touch users just swipe) */}
      <div style={s("position: absolute; right: clamp(14px, 3vw, 26px); top: 50%; transform: translateY(-50%); z-index: 3; display: none; flex-direction: column; gap: 12px;")} className="webshots-reel-nav">
        <button type="button" onClick={() => step(-1)} aria-label="Previous" style={s("width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.22); background: rgba(12,8,16,0.6); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Next" style={s("width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.22); background: rgba(12,8,16,0.6); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      {/* "Swipe to watch" — gentle ~1s cue on open so the scroll is obvious */}
      {showIntro && items.length > 0 && (
        <div style={s("position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; pointer-events: none; color: #fff;")}>
          <div style={s("display: flex; flex-direction: column; align-items: center; gap: 12px; animation: webshots-reel-intro 1.5s cubic-bezier(.2,.7,.2,1) forwards;")}>
            <span style={s("width: 58px; height: 58px; border-radius: 50%; border: 1px solid rgba(255,60,74,0.5); background: rgba(12,6,10,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;")}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "webshots-reel-bob 1.1s ease-in-out infinite" }}><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></svg>
            </span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.28em; text-transform: uppercase; text-shadow: 0 2px 16px rgba(0,0,0,0.8);")}>Swipe to watch</span>
          </div>
        </div>
      )}
    </div>
  );
}
