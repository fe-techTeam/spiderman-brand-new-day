"use client";

import { s, sx } from "@/lib/style";

// Empty-state stand-in for the design's <image-slot> custom element. In the
// mockup these slots are user-fillable and ship empty, rendering a dashed ring
// + image icon + caption. Reproduced here as a static placeholder (image upload
// is out of scope for Phase 1). Tuned for the dark forum cards.
export default function ImageSlot({ placeholder = "Drop an image", style = "" }) {
  return (
    <div style={sx("position: relative;", style)}>
      {/* dashed ring */}
      <div style={s("position: absolute; inset: 0; pointer-events: none; border: 1.5px dashed rgba(255,255,255,0.14); border-radius: inherit;")}></div>
      {/* empty state */}
      <div style={s("position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; padding: 12px; box-sizing: border-box; color: rgba(255,255,255,0.4);")}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <div style={s("max-width: 90%; font-weight: 500; letter-spacing: 0.01em; font-size: 13px;")}>{placeholder}</div>
      </div>
    </div>
  );
}
