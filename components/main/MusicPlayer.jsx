"use client";

// Marvel music player — port of the design's corner widget, placed bottom-LEFT
// per user request. Mounted once in the root layout so the score persists across
// every route. A hidden looping YouTube player supplies it: it autoplays MUTED on
// load (allowed by autoplay policies) and the first user interaction anywhere
// unmutes it instantly (already buffered). The UI is an always-spinning
// album-cover disc (12s idle, 4s while playing) whose controls slide out on hover
// (desktop) or disc-tap (touch): the track label, a 16-bar spectrum that dances
// while the music plays, and one red button that toggles mute.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { s } from "@/lib/style";

const TRACK_ID = "WSv4BfIMNRA";
// per-bar resting heights (verbatim from the design's specBars table)
const SPEC_BARS = [0.55, 0.9, 0.4, 1, 0.7, 0.5, 0.95, 0.6, 0.85, 0.45, 1, 0.65, 0.5, 0.9, 0.6, 0.8];

export default function MusicPlayer({ onSfx }) {
  const pathname = usePathname();
  const isHome = pathname === "/"; // only the landing docks the player by the hamburger
  const [open, setOpen] = useState(false); // touch devices: tapped-open controls
  const [playing, setPlaying] = useState(false);
  // Autoplay policy: the track starts MUTED on load (allowed everywhere) so it is
  // buffered and already running silently; the first user interaction unmutes it
  // instantly (no load lag). So the initial UI state is muted.
  const [muted, setMuted] = useState(true);
  const ytRef = useRef(null);
  const hostRef = useRef(null);
  const specRef = useRef(null);
  const playingRef = useRef(false);
  const mutedRef = useRef(true);
  // mirror playing/muted into refs so window-event handlers read fresh values
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const wantAudibleRef = useRef(false); // user wants sound (armed on first gesture)
  const userMutedRef = useRef(false);   // user explicitly muted — never auto-unmute
  const trailerOpenRef = useRef(false);        // a TrailerModal is on screen
  const resumeAfterTrailerRef = useRef(false); // score owes a resume when the trailer closes

  /* hidden 1×1 YouTube player — audio only */
  useEffect(() => {
    let retry = null;
    let cancelled = false;
    let player = null;
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const build = () => {
      if (cancelled) return;
      if (!window.YT || !window.YT.Player) { retry = setTimeout(build, 300); return; }
      const host = hostRef.current;
      if (!host) return;
      const mount = document.createElement("div");
      host.appendChild(mount);
      player = new window.YT.Player(mount, {
        videoId: TRACK_ID,
        playerVars: { autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: TRACK_ID, playsinline: 1 },
        events: {
          onReady: (e) => {
            // muted autoplay keeps the score buffered and running from load, so
            // the first unmute is instant (no fetch/buffer lag on toggle-on)
            try { e.target.mute(); e.target.playVideo(); } catch {}
            // if the user already interacted before the player finished loading,
            // honor it and bring the sound in now — unless the trailer is up,
            // in which case hold the score and owe the resume to trailer-close
            if (wantAudibleRef.current && !userMutedRef.current) {
              if (trailerOpenRef.current) {
                resumeAfterTrailerRef.current = true;
                try { e.target.pauseVideo(); } catch {}
              } else {
                try { e.target.unMute(); } catch {}
                setMuted(false);
              }
            }
          },
          onStateChange: (e) => {
            const YT = window.YT;
            if (!YT) return;
            if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) setPlaying(false);
          },
        },
      });
      ytRef.current = player;
    };
    build();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      try { player && player.destroy && player.destroy(); } catch {}
      ytRef.current = null;
    };
  }, []);

  /* spectrum loop — randomized bar heights every ~140ms while playing, easing
     back to the resting 0.22 scale when the track stops (design's _specLoop) */
  useEffect(() => {
    let raf = null;
    let last = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const wrap = specRef.current;
      if (!wrap) return;
      const bars = wrap.children;
      if (playingRef.current) {
        if (now - last < 140) return;
        last = now;
        for (const b of bars) {
          b.style.transition = "transform .14s ease-out";
          b.style.transform = `scaleY(${(0.24 + Math.random() * 0.76).toFixed(3)})`;
        }
      } else {
        for (const b of bars) {
          if (b.style.transform !== "scaleY(0.22)") {
            b.style.transition = "transform .3s ease";
            b.style.transform = "scaleY(0.22)";
          }
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []);

  /* Autoplay begins muted; the first interaction ANYWHERE on the page makes the
     score audible — the track is already buffered, so it comes in instantly.
     Fires once, and never overrides an explicit user mute. */
  useEffect(() => {
    const makeAudible = () => {
      if (wantAudibleRef.current) return;
      wantAudibleRef.current = true;
      if (!userMutedRef.current) {
        const yt = ytRef.current;
        if (yt && yt.unMute) { try { yt.unMute(); yt.playVideo(); } catch {} }
        setMuted(false);
        setPlaying(true);
      }
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", makeAudible);
      window.removeEventListener("keydown", makeAudible);
      window.removeEventListener("touchstart", makeAudible);
      window.removeEventListener("wheel", makeAudible);
    };
    window.addEventListener("pointerdown", makeAudible, { passive: true });
    window.addEventListener("keydown", makeAudible, { passive: true });
    window.addEventListener("touchstart", makeAudible, { passive: true });
    window.addEventListener("wheel", makeAudible, { passive: true });
    return cleanup;
  }, []);

  /* Trailer ducking — TrailerModal announces its lifecycle on window. Pause the
     score only if it is actually audible (a muted or already-paused track has
     nothing to yield), and on close resume only what we paused ourselves —
     never overriding an explicit user mute. */
  useEffect(() => {
    const onTrailerOpen = () => {
      trailerOpenRef.current = true;
      resumeAfterTrailerRef.current = playingRef.current && !mutedRef.current;
      if (!resumeAfterTrailerRef.current) return;
      const yt = ytRef.current;
      if (yt && yt.pauseVideo) { try { yt.pauseVideo(); } catch {} }
      setPlaying(false);
    };
    const onTrailerClose = () => {
      trailerOpenRef.current = false;
      if (resumeAfterTrailerRef.current && !userMutedRef.current) {
        // unMute too: if the player only became ready mid-trailer, the deferred
        // first-gesture unmute lands here (it's a no-op on the normal path)
        const yt = ytRef.current;
        if (yt) { try { yt.unMute(); yt.playVideo(); } catch {} }
        setMuted(false);
        setPlaying(true);
      }
      resumeAfterTrailerRef.current = false;
    };
    window.addEventListener("bnd:trailer-open", onTrailerOpen);
    window.addEventListener("bnd:trailer-close", onTrailerClose);
    return () => {
      window.removeEventListener("bnd:trailer-open", onTrailerOpen);
      window.removeEventListener("bnd:trailer-close", onTrailerClose);
    };
  }, []);

  /* touch-opened controls close themselves after 2s of no interaction —
     the open tray hanging around looked clunky on phones. Any interaction
     (play/mute) re-arms the window. */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 2000);
    return () => clearTimeout(t);
  }, [open, playing, muted]);

  const sfx = () => onSfx && onSfx();
  const togglePlay = () => {
    sfx();
    wantAudibleRef.current = true;
    const yt = ytRef.current;
    const next = !playing;
    setPlaying(next);
    if (yt && yt.playVideo) { next ? yt.playVideo() : yt.pauseVideo(); }
    // resuming a still-muted autoplay track: bring the sound in (unless the user
    // deliberately muted it) — the buffer is warm, so it's instant
    if (next && muted && !userMutedRef.current) {
      if (yt && yt.unMute) { try { yt.unMute(); } catch {} }
      setMuted(false);
    }
  };
  const toggleMute = () => {
    sfx();
    wantAudibleRef.current = true;
    const yt = ytRef.current;
    if (muted) {
      // unmute — the track is already buffered/playing, so this is instant
      userMutedRef.current = false;
      setMuted(false);
      setPlaying(true);
      if (yt) { try { yt.unMute(); yt.playVideo(); } catch {} }
    } else {
      userMutedRef.current = true;
      setMuted(true);
      if (yt) { try { yt.mute(); } catch {} }
    }
  };
  const onDiscClick = () => {
    sfx();
    // hover devices expand on hover, so the disc is the play/pause; touch
    // devices use the disc as the open/close toggle instead
    const canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    if (canHover) togglePlay();
    else setOpen((v) => !v);
  };

  return (
    <>
      {/* hidden 1×1 player host — audio only */}
      <div ref={hostRef} style={s("position: fixed; width: 1px; height: 1px; left: -9999px; top: -9999px; overflow: hidden; pointer-events: none;")}></div>

      {/* z-index 50 = same layer as the navbar; popups/menus (z 55+) cover it */}
      <div className={`bnd-music${isHome ? " bnd-music--home" : ""}${open ? " open" : ""}`} style={s("position: fixed; left: clamp(16px, 2.5vw, 30px); bottom: calc(clamp(16px, 2.5vw, 30px) + env(safe-area-inset-bottom, 0px)); z-index: 50; display: flex; align-items: center;")}>
        <div style={s("position: relative; display: flex; align-items: center; padding: 8px; background: linear-gradient(150deg, rgba(20,10,16,0.92), rgba(9,7,14,0.94)); border: 1px solid rgba(255,60,74,0.35); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); box-shadow: 0 12px 34px rgba(0,0,0,0.5), 0 0 22px rgba(255,40,60,0.15); backdrop-filter: blur(8px);")}>
          {/* spinning cover disc (expand toggle on touch, play/pause on desktop) */}
          <div onClick={onDiscClick} data-web-hover="true" role="button" aria-label={playing ? "Pause music" : "Play music"} className="bnd-music-disc" style={{ position: "relative", width: "46px", height: "46px", borderRadius: "50%", overflow: "hidden", background: "#0c0a16", border: "1px solid rgba(255,60,74,0.55)", flexShrink: 0, cursor: "pointer", boxShadow: "0 0 14px rgba(255,40,60,0.3)", animation: `bnd-disc-spin ${playing ? "4s" : "12s"} linear infinite` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/music-cover.png" alt="Brand New Day OST" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={s("position: absolute; inset: 0; border-radius: 50%; background: repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.14) 0 2px, transparent 2px 4px); pointer-events: none;")}></div>
            <span style={s("position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: #0c0a16; border: 1px solid rgba(255,90,106,0.7); box-shadow: 0 0 0 2px rgba(0,0,0,0.4);")}></span>
          </div>

          {/* collapsible controls: hover on desktop, tap on mobile */}
          <div className="bnd-music-body">
            <div style={s("display: flex; flex-direction: column; gap: 4px; min-width: 0; padding-left: 12px; padding-right: 4px;")}>
              <span className="bnd-music-title" style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #fff; white-space: nowrap;")}>Brand New Day <span style={{ color: "rgba(255,255,255,0.4)" }}>· OST</span></span>
              {/* spectrum */}
              <div ref={specRef} className="bnd-music-spec" style={s("display: flex; align-items: flex-end; gap: 2px; height: 16px;")}>
                {SPEC_BARS.map((h, i) => (
                  <span key={i} className="bnd-eq-bar" style={{ width: "2.5px", height: `${Math.round(h * 100)}%`, animationDuration: `${(0.5 + (i % 5) * 0.12).toFixed(2)}s`, animationDelay: `${((i % 7) * 0.07).toFixed(2)}s` }}></span>
                ))}
              </div>
            </div>
            {/* mute (also starts playback if idle) */}
            <button onClick={toggleMute} data-web-hover="true" aria-label="Mute or unmute" className="bnd-music-mute" style={s("flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; background: linear-gradient(180deg, #ff3a4a, #c00014); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(214,2,26,0.45);")}>
              {muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
