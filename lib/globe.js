// Marvel-style dot-matrix world map with heat blooms, city pings, animated
// web-thread arcs, and twin threads. Ported 1:1 from the mockup's `_initGlobe`.
// initGlobe(canvas, { getTwinActive }) -> { destroy }

import { CITIES, CITY_LL } from "./cities";

export function initGlobe(cv, { getTwinActive } = {}) {
  if (!cv) return { destroy() {} };

  // Rough continent polygons (lon, lat) — stylized, HUD-accurate enough
  const CONT = [
    [[-168, 66], [-160, 71], [-95, 70], [-82, 73], [-60, 60], [-55, 50], [-66, 46], [-80, 42], [-80, 26], [-97, 25], [-107, 23], [-110, 30], [-124, 34], [-125, 48], [-140, 60], [-168, 66]],
    [[-92, 18], [-83, 15], [-77, 8], [-83, 9], [-90, 14], [-92, 18]],
    [[-80, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -23], [-58, -34], [-65, -42], [-73, -52], [-71, -40], [-70, -20], [-78, -4], [-80, 8]],
    [[-10, 36], [-9, 44], [0, 49], [2, 51], [-5, 58], [5, 62], [12, 66], [30, 70], [42, 66], [40, 50], [28, 45], [20, 40], [15, 38], [-10, 36]],
    [[-17, 21], [-16, 14], [-8, 4], [8, 4], [10, -2], [13, -10], [12, -17], [20, -35], [26, -34], [33, -28], [40, -16], [51, -2], [43, 10], [37, 15], [32, 31], [25, 32], [10, 37], [-6, 36], [-17, 28], [-17, 21]],
    [[40, 66], [60, 72], [100, 78], [140, 73], [160, 68], [178, 66], [170, 60], [140, 52], [135, 45], [122, 40], [121, 30], [108, 20], [95, 16], [92, 22], [80, 8], [77, 8], [70, 20], [60, 25], [45, 40], [40, 50], [40, 66]],
    [[95, 5], [120, 2], [140, -5], [135, -9], [115, -8], [100, 0], [95, 5]],
    [[113, -22], [130, -12], [142, -11], [150, -25], [153, -28], [147, -38], [138, -35], [129, -32], [115, -34], [113, -22]],
    [[130, 31], [141, 40], [141, 45], [136, 36], [130, 31]],
    [[-45, 60], [-30, 60], [-20, 70], [-30, 83], [-55, 80], [-50, 68], [-45, 60]],
  ];
  const inPoly = (x, y, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  const isLand = (lon, lat) => CONT.some((p) => inPoly(lon, lat, p));

  const LAT_TOP = 78, LAT_BOT = -58;
  const cityCoords = CITIES.map((name) => CITY_LL[name] || [0, 0]);

  const proj = (lon, lat, W, H) => {
    const padY = H * 0.1;
    const mh = H - padY * 2;
    const x = ((lon + 180) / 360) * W;
    const y = padY + ((LAT_TOP - lat) / (LAT_TOP - LAT_BOT)) * mh;
    return [x, y];
  };

  let W = 0, H = 0, dpr = 1, dots = [];
  let globeExtra = [], twinHomePx = null, twinDestPx = null, globeHubs = [];
  const ctx = cv.getContext("2d");

  const build = () => {
    const rect = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hubsPx = cityCoords.map(([lon, lat]) => proj(lon, lat, W, H));
    const heatScale = Math.max(58, W * 0.065);
    dots = [];
    const stepLon = 2.1, stepLat = 2.1;
    for (let lat = LAT_TOP; lat >= LAT_BOT; lat -= stepLat) {
      for (let lon = -180; lon <= 180; lon += stepLon) {
        if (isLand(lon, lat)) {
          const [x, y] = proj(lon, lat, W, H);
          let dmin = 1e9;
          for (let k = 0; k < hubsPx.length; k++) {
            const dx = x - hubsPx[k][0], dy = y - hubsPx[k][1];
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < dmin) dmin = d;
          }
          const heat = Math.exp(-dmin / heatScale);
          dots.push({ x, y, heat, tw: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.3 });
        }
      }
    }
    const extraLL = [
      [-118, 34], [-122, 37.7], [-87.6, 41.8], [-95.4, 29.8], [-80.2, 25.8], [-73.6, 45.5],
      [-3.7, 40.4], [12.5, 41.9], [9.2, 45.5], [4.9, 52.4], [37.6, 55.8], [28, -26.2],
      [31.2, 30], [39.3, 21.5], [100.5, 13.7], [103.8, 1.35], [116.4, 39.9], [121.5, 31.2],
      [114.1, 22.3], [126.9, 37.6], [-58.4, -34.6], [-43.2, -22.9], [-70.7, -33.5], [3.4, 6.5], [6.4, 4.8],
    ];
    globeExtra = extraLL.map(([lon, lat]) => proj(lon, lat, W, H));
    twinHomePx = proj(72.8, 19.1, W, H);
    twinDestPx = [[-46.6, -23.5], [-0.1, 51.5], [139.7, 35.7], [151.2, -33.9], [-74, 40.7]].map(([lo, la]) => proj(lo, la, W, H));
    globeHubs = hubsPx;
  };
  build();

  const arcs = [];
  const spawnArc = () => {
    const n = cityCoords.length;
    const a = Math.floor(Math.random() * n);
    let b = Math.floor(Math.random() * n);
    if (b === a) b = (b + 1) % n;
    arcs.push({ a, b, t0: performance.now(), dur: 1600 + Math.random() * 900 });
    if (arcs.length > 6) arcs.shift();
  };
  const arcTimer = setInterval(spawnArc, 900);

  let raf = null;
  const draw = () => {
    const now = performance.now();
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    const hubs = globeHubs || [];
    for (let i = 0; i < hubs.length; i++) {
      const hx = hubs[i][0], hy = hubs[i][1];
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.3 + i * 0.9);
      const rad = 50 * (0.8 + 0.25 * Math.sin(t * 1.3 + i));
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, rad);
      g.addColorStop(0, `rgba(255,90,60,${(0.24 * pulse).toFixed(3)})`);
      g.addColorStop(0.42, `rgba(255,50,48,${(0.1 * pulse).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,40,40,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hx, hy, rad, 0, 6.283); ctx.fill();
    }
    const extra = globeExtra || [];
    for (let i = 0; i < extra.length; i++) {
      const ex = extra[i][0], ey = extra[i][1];
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.7);
      const rad = 30 * (0.8 + 0.25 * Math.sin(t * 1.1 + i * 0.6));
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, rad);
      g.addColorStop(0, `rgba(255,110,70,${(0.15 * pulse).toFixed(3)})`);
      g.addColorStop(0.5, `rgba(255,60,55,${(0.055 * pulse).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,40,40,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ex, ey, rad, 0, 6.283); ctx.fill();
    }

    const sweepX = (((t * 0.05) % 1.35) - 0.18) * W;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const tw = 0.7 + 0.3 * Math.sin(t * d.sp + d.tw);
      const sd = Math.abs(d.x - sweepX);
      const sweep = sd < 55 ? (1 - sd / 55) * 0.55 : 0;
      const heat = Math.min(1, d.heat + sweep);
      let r, g, b, a, rr;
      if (heat > 0.24) {
        r = 255; g = Math.round(80 + (1 - heat) * 110); b = Math.round(55 * (1 - heat));
        a = (0.34 + heat * 0.56) * tw;
        rr = heat > 0.55 ? 1.5 : 1.15;
      } else {
        r = 110; g = 150; b = 230;
        a = (0.2 + heat * 0.45) * tw;
        rr = 1.05;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
      ctx.arc(d.x, d.y, rr, 0, 6.283);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    for (let i = 0; i < cityCoords.length; i++) {
      const [lon, lat] = cityCoords[i];
      const [x, y] = proj(lon, lat, W, H);
      const ph = (now / 1000 + i * 0.7) % 2.4;
      const pr = 3 + ph * 10;
      const pa = Math.max(0, 0.55 - ph * 0.22);
      ctx.beginPath(); ctx.arc(x, y, pr, 0, 6.283);
      ctx.strokeStyle = `rgba(255,90,105,${pa})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 6.283);
      ctx.fillStyle = "#ff7280"; ctx.shadowColor = "rgba(255,80,95,1)"; ctx.shadowBlur = 20; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283);
      ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 8; ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < arcs.length; k++) {
      const ar = arcs[k];
      const t2 = Math.min(1, (now - ar.t0) / ar.dur);
      const [lonA, latA] = cityCoords[ar.a];
      const [lonB, latB] = cityCoords[ar.b];
      const [x1, y1] = proj(lonA, latA, W, H);
      const [x2, y2] = proj(lonB, latB, W, H);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const seg = 26; const tt = t2;
      for (let s = 1; s <= seg; s++) {
        const u = (s / seg) * tt;
        const iu = 1 - u;
        const px = iu * iu * x1 + 2 * iu * u * mx + u * u * x2;
        const py = iu * iu * y1 + 2 * iu * u * my + u * u * y2;
        ctx.lineTo(px, py);
      }
      const fade = t2 < 0.85 ? 0.8 : 0.8 * (1 - (t2 - 0.85) / 0.15);
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(255,70,85,${fade})`);
      grad.addColorStop(1, `rgba(120,170,255,${fade})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "rgba(120,150,255,0.8)"; ctx.shadowBlur = 7;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const iu = 1 - tt;
      const hx = iu * iu * x1 + 2 * iu * tt * mx + tt * tt * x2;
      const hy = iu * iu * y1 + 2 * iu * tt * my + tt * tt * y2;
      if (t2 < 1) {
        ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, 6.283);
        ctx.fillStyle = "#eaf2ff"; ctx.shadowColor = "#8ab4ff"; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    if (getTwinActive && getTwinActive() && twinHomePx && twinDestPx) {
      const hx0 = twinHomePx[0], hy0 = twinHomePx[1];
      for (let i = 0; i < twinDestPx.length; i++) {
        const dx = twinDestPx[i][0], dy = twinDestPx[i][1];
        const mx = (hx0 + dx) / 2, my = (hy0 + dy) / 2 - Math.hypot(dx - hx0, dy - hy0) * 0.3;
        ctx.beginPath(); ctx.moveTo(hx0, hy0);
        const seg = 30;
        for (let s = 1; s <= seg; s++) { const u = s / seg, iu = 1 - u; ctx.lineTo(iu * iu * hx0 + 2 * iu * u * mx + u * u * dx, iu * iu * hy0 + 2 * iu * u * my + u * u * dy); }
        const grad = ctx.createLinearGradient(hx0, hy0, dx, dy);
        grad.addColorStop(0, "rgba(255,70,85,0.55)"); grad.addColorStop(1, "rgba(120,170,255,0.55)");
        ctx.strokeStyle = grad; ctx.lineWidth = 1.2; ctx.shadowColor = "rgba(255,100,130,0.6)"; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
        const flow = (t * 0.35 + i * 0.18) % 1; const iuf = 1 - flow;
        const px = iuf * iuf * hx0 + 2 * iuf * flow * mx + flow * flow * dx, py = iuf * iuf * hy0 + 2 * iuf * flow * my + flow * flow * dy;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 6.283); ctx.fillStyle = "#fff"; ctx.shadowColor = "#8ab4ff"; ctx.shadowBlur = 13; ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(dx, dy, 2.8, 0, 6.283); ctx.fillStyle = "#ff7280"; ctx.shadowColor = "#ff5a6a"; ctx.shadowBlur = 11; ctx.fill(); ctx.shadowBlur = 0;
      }
      const hp = 0.6 + 0.4 * Math.sin(t * 2.2);
      ctx.beginPath(); ctx.arc(hx0, hy0, 4, 0, 6.283); ctx.fillStyle = "#fff"; ctx.shadowColor = "#ff5a6a"; ctx.shadowBlur = 20 * hp; ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = "source-over";

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  const onResize = () => build();
  window.addEventListener("resize", onResize, { passive: true });

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      clearInterval(arcTimer);
      window.removeEventListener("resize", onResize);
    },
  };
}
