// Floating dust particles behind the "Find Your Identity" section.
// Ported 1:1 from the mockup's `_initIdParticles`. initParticles(canvas) -> { destroy }

export function initParticles(cv) {
  if (!cv) return { destroy() {} };
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, parts = [];

  const build = () => {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(36, Math.round(W / 22));
    parts = [];
    for (let i = 0; i < count; i++) {
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.6 + Math.random() * 1.8,
        vy: -(0.12 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 0.18,
        a: 0.15 + Math.random() * 0.5,
        tw: Math.random() * 6.28,
        red: Math.random() < 0.4,
      });
    }
  };
  build();

  let raf = null;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.y += p.vy; p.x += p.vx; p.tw += 0.03;
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
      const tw = 0.6 + Math.sin(p.tw) * 0.4;
      const col = p.red ? "255,90,106" : "150,180,255";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = `rgba(${col},${(p.a * tw).toFixed(3)})`;
      ctx.shadowColor = `rgba(${col},0.8)`; ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  const onResize = () => build();
  window.addEventListener("resize", onResize, { passive: true });

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    },
  };
}
