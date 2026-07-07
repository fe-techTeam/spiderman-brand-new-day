// Relative-time formatting for API timestamps → the UI's "now / 2m / 3h / 1d" style.

export function relTime(input) {
  if (!input) return "";
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

/** 4200 → "4.2k" (matches the forum's fmt()). */
export function fmtCount(n) {
  if (n == null) return "0";
  if (Math.abs(n) >= 1000) {
    const k = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return `${k}k`;
  }
  return String(n);
}
