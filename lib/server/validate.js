// Tiny input validators — no dependency needed at this scale. Each returns
// a trimmed/normalized value or null when invalid.

export function vString(v, { min = 1, max = 255 } = {}) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < min || t.length > max) return null;
  return t;
}

export function vEmail(v) {
  const t = vString(v, { max: 255 });
  if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  return t.toLowerCase();
}

export function vUsername(v) {
  const t = vString(v, { min: 3, max: 30 });
  if (!t) return null;
  const lower = t.toLowerCase();
  // Keeps the frontend @mention regex (@[A-Za-z0-9_]+) valid for every handle.
  if (!/^[a-z0-9_]{3,30}$/.test(lower)) return null;
  return lower;
}

export function vPassword(v) {
  if (typeof v !== "string") return null;
  if (v.length < 8 || v.length > 128) return null;
  if (!/[a-zA-Z]/.test(v) || !/[0-9]/.test(v)) return null;
  return v;
}

export function vId(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > Number.MAX_SAFE_INTEGER) return null;
  return n;
}

export function vEnum(v, allowed) {
  return allowed.includes(v) ? v : null;
}
