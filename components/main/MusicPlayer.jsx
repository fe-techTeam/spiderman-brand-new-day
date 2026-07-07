"use client";

// Marvel music player (ported from the design's bottom corner widget, placed
// bottom-LEFT per user request). A hidden 1×1 YouTube IFrame player loops the
// score; the UI is a spinning spider disc that expands into label + equalizer
// + play/mute/collapse controls. The disc spins and the eq bars dance only
// while music is actually playing (synced from the player's state events).

import { useEffect, useRef, useState } from "react";
import { s } from "@/lib/style";

const TRACK_ID = "WSv4BfIMNRA";

export default function MusicPlayer({ onSfx }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const ytRef = useRef(null);
  const hostRef = useRef(null);

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
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: TRACK_ID, playsinline: 1 },
        events: {
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

  const sfx = () => onSfx && onSfx();
  const togglePlay = () => {
    sfx();
    const yt = ytRef.current;
    if (!yt || !yt.playVideo) return;
    if (playing) { yt.pauseVideo(); setPlaying(false); }
    else { yt.playVideo(); setPlaying(true); }
  };
  const toggleMute = () => {
    sfx();
    const yt = ytRef.current;
    if (!yt || !yt.mute) return;
    if (muted) { yt.unMute(); setMuted(false); }
    else { yt.mute(); setMuted(true); }
  };
  const onDiscClick = () => {
    if (!open) { sfx(); setOpen(true); return; }
    togglePlay();
  };

  return (
    <>
      {/* hidden 1×1 player host — audio only */}
      <div ref={hostRef} style={s("position: fixed; width: 1px; height: 1px; left: -9999px; top: -9999px; overflow: hidden; pointer-events: none;")}></div>

      <div style={s("position: fixed; left: clamp(16px, 2.5vw, 30px); bottom: calc(clamp(16px, 2.5vw, 30px) + env(safe-area-inset-bottom, 0px)); z-index: 90; display: flex; align-items: center; gap: 12px;")}>
        <div style={s("position: relative; display: flex; align-items: center; gap: 10px; padding: 8px; background: linear-gradient(150deg, rgba(20,10,16,0.92), rgba(9,7,14,0.94)); border: 1px solid rgba(255,60,74,0.35); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); box-shadow: 0 12px 34px rgba(0,0,0,0.5), 0 0 22px rgba(255,40,60,0.15); backdrop-filter: blur(8px); transition: padding .3s ease;")}>
          {/* spinning disc (also expand / play toggle) */}
          <div onClick={onDiscClick} data-web-hover="true" role="button" aria-label={open ? "Play or pause music" : "Open music player"} style={{ position: "relative", width: "44px", height: "44px", borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, #2a1420 0%, #0c0a16 62%, #1a0c12 100%)", border: "1px solid rgba(255,60,74,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", boxShadow: "0 0 14px rgba(255,40,60,0.25)", animation: playing ? "bnd-disc-spin 4s linear infinite" : "none" }}>
            <div style={s("position: absolute; inset: 0; border-radius: 50%; background: repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0 2px, transparent 2px 4px);")}></div>
            <svg viewBox="0 0 100 100" style={{ width: "46%", height: "46%", position: "relative" }} fill="none" stroke="#ff5a6a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="50" cy="44" rx="9" ry="12" /><path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" /></svg>
            <span style={s("position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #0c0a16; border: 1px solid rgba(255,90,106,0.6);")}></span>
          </div>

          {open && (
            <>
              {/* label + equalizer */}
              <div className={playing ? "bnd-music-on" : undefined} style={s("display: flex; flex-direction: column; gap: 3px; min-width: 0;")}>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #fff; white-space: nowrap;")}>Brand New Day</span>
                <div style={s("display: flex; align-items: flex-end; gap: 2px; height: 12px;")}>
                  <span data-eq style={s("width: 3px; height: 40%; background: #ff5a6a; border-radius: 1px;")}></span>
                  <span data-eq style={s("width: 3px; height: 80%; background: #ff5a6a; border-radius: 1px;")}></span>
                  <span data-eq style={s("width: 3px; height: 55%; background: #ff5a6a; border-radius: 1px;")}></span>
                  <span data-eq style={s("width: 3px; height: 95%; background: #ff5a6a; border-radius: 1px;")}></span>
                  <span data-eq style={s("width: 3px; height: 65%; background: #ff5a6a; border-radius: 1px;")}></span>
                </div>
              </div>
              {/* play / pause */}
              <button onClick={togglePlay} data-web-hover="true" aria-label="Play or pause" style={s("flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; background: linear-gradient(180deg, #ff3a4a, #c00014); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(214,2,26,0.45);")}>
                {playing ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: "2px" }}><path d="M5 3l16 9-16 9z" /></svg>
                )}
              </button>
              {/* mute */}
              <button onClick={toggleMute} data-web-hover="true" aria-label="Mute or unmute" style={s("flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.16); cursor: pointer; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;")}>
                {muted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>
                )}
              </button>
              {/* collapse */}
              <button onClick={() => { sfx(); setOpen(false); }} data-web-hover="true" aria-label="Minimize player" style={s("flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; border: 0; cursor: pointer; background: transparent; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5);")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg></button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
