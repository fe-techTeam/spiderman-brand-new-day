"use client";

/* eslint-disable @next/next/no-img-element */

// Webshots reel — a full-screen vertical, one-at-a-time viewer opened by
// tapping a tile on the wall. NOT a Shorts/Reels clone: it leans on native CSS
// scroll-snap for the swipe (robust across touch, trackpad, wheel and keyboard)
// and IntersectionObserver to decide which slide is "live". Videos autoplay
// muted + looped, one at a time; images simply hold until you swipe (no
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
function ReelSlide({ item, index, active, near, muted, rootRef, onActivate }) {
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
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* not seekable yet — harmless */
      }
    }
  }, [active, muted]);

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
      <div style={s("position: absolute; left: clamp(16px, 5vw, 28px); bottom: clamp(22px, 6vh, 40px); right: clamp(70px, 16vw, 90px); z-index: 2; display: flex; align-items: center; gap: 10px;")}>
        <span style={s("width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.5); display: flex; align-items: center; justify-content: center;")}>
          <img src="/assets/cursor-spider-red.svg" alt="" style={s("width: 62%; height: 62%; display: block;")} />
        </span>
        <div style={s("min-width: 0;")}>
          <p style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: 14px; letter-spacing: 0.04em; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{authorLabel(item.author)}</p>
          <p style={s("margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.6);")}>{relTime(item.createdAt)}</p>
        </div>
      </div>
    </section>
  );
}

export default function WebshotsReel({ items, startIndex = 0, hasMore = false, loadingMore = false, onNeedMore, onClose }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [showHint, setShowHint] = useState(true);

  const onActivate = useCallback((i) => {
    setActiveIndex(i);
    setShowHint(false);
  }, []);

  // Jump to the tapped tile before first paint (no scroll-flash from the top).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
  }, [startIndex]);

  // Lock the page behind the reel.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  // Pull the next page once you're within a few slides of the end.
  useEffect(() => {
    if (hasMore && !loadingMore && onNeedMore && activeIndex >= items.length - 3) onNeedMore();
  }, [activeIndex, items.length, hasMore, loadingMore, onNeedMore]);

  // Keyboard: arrows step one slide, Escape closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
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
  }, [onClose]);

  const step = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ top: dir * el.clientHeight, behavior: "smooth" });
  };

  return (
    <div style={s("position: fixed; inset: 0; z-index: 200; background: radial-gradient(130% 90% at 80% -10%, #1c0512 0%, #0b0713 45%, #06080f 100%); animation: bnd-word-rise 260ms cubic-bezier(.2,.7,.2,1) both;")}>
      <style>{`.webshots-reel-scroll::-webkit-scrollbar{display:none}
        @keyframes webshots-reel-hint{0%,100%{transform:translateY(0);opacity:.85}50%{transform:translateY(7px);opacity:.4}}`}</style>

      {/* scroller: the whole swipe surface */}
      <div
        ref={scrollRef}
        className="webshots-reel-scroll"
        style={s("position: absolute; inset: 0; margin: 0 auto; max-width: min(560px, 100%); height: 100%; overflow-y: scroll; overflow-x: hidden; scroll-snap-type: y mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; display: flex; flex-direction: column;")}
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
          />
        ))}
        {loadingMore && (
          <div style={s("flex: 0 0 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase;")}>
            Loading more…
          </div>
        )}
      </div>

      {/* top chrome: label · sound · close */}
      <div style={s("position: absolute; top: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; gap: 12px; padding: clamp(14px, 3vh, 22px) clamp(16px, 4vw, 28px); background: linear-gradient(to bottom, rgba(4,3,9,0.55), transparent); pointer-events: none;")}>
        <span style={s("display: inline-flex; align-items: center; gap: 8px; pointer-events: auto;")}>
          <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.28em; text-transform: uppercase; color: #ff6b79;")}>Webshots</span>
        </span>
        <div style={s("margin-left: auto; display: flex; align-items: center; gap: 10px; pointer-events: auto;")}>
          <button
            type="button"
            onClick={() => {
              setMuted((m) => !m);
              setShowHint(false);
            }}
            aria-label={muted ? "Unmute" : "Mute"}
            style={s("width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.22); background: rgba(12,8,16,0.6); backdrop-filter: blur(6px); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;")}
          >
            <SpeakerIcon muted={muted} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={s("width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.22); background: rgba(12,8,16,0.6); backdrop-filter: blur(6px); color: #fff; font-size: 22px; line-height: 1; cursor: pointer;")}
          >
            ×
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
      <style>{`@media (hover:hover) and (pointer:fine){.webshots-reel-nav{display:flex !important}}`}</style>

      {/* first-run swipe hint */}
      {showHint && items.length > 1 && (
        <div style={s("position: absolute; left: 50%; bottom: clamp(16px, 4vh, 28px); transform: translateX(-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; color: rgba(255,255,255,0.85);")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "webshots-reel-hint 1.6s ease-in-out infinite" }}><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></svg>
          <span style={s("font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase;")}>Swipe for more</span>
        </div>
      )}
    </div>
  );
}
