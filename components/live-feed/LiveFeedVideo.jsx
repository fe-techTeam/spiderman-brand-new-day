"use client";

import { useEffect, useRef } from "react";

// Lazy <video> for the Live Feed grid: no src (zero bytes fetched) until the
// card nears the viewport, then metadata-only so the first frame becomes the
// poster; playback pauses again once scrolled away. Keeps a video-heavy feed
// from hammering bandwidth — full files stream only on an actual play.
// The src swap is imperative (not state) — React never reconciles it away
// since src isn't rendered as a prop.
export default function LiveFeedVideo({ src, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.src = src; // ancient browser: behave like a plain <video>
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!el.src) el.src = src; // near viewport → fetch the poster frame
        } else if (!el.paused) {
          el.pause(); // scrolled away mid-play
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  return <video ref={ref} controls playsInline preload="metadata" style={style} />;
}
