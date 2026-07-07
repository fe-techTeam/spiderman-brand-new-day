// Resolve a signup's country from the request IP (client request: the mobile
// field is hidden from the UI, so the dial code no longer tells us the
// country). CDN geo headers are free and instant when present; otherwise a
// best-effort external lookup with a short timeout. Unknown → null, never a
// guessed default.

import { COUNTRIES } from "@/lib/geo";

// set by common CDNs / proxies when geo lookup is enabled
const GEO_HEADERS = [
  "cf-ipcountry",             // Cloudflare
  "x-vercel-ip-country",      // Vercel
  "cloudfront-viewer-country",// AWS CloudFront
  "x-country-code",           // generic nginx/geoip setups
];

function isoToName(iso) {
  if (!iso || !/^[A-Za-z]{2}$/.test(iso)) return null;
  const up = iso.toUpperCase();
  if (up === "XX" || up === "T1") return null; // Cloudflare unknown / Tor markers
  const listed = COUNTRIES.find((c) => c.iso === up);
  if (listed) return listed.name;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(up);
    return name && name !== up ? name : null;
  } catch {
    return null;
  }
}

function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd && fwd.split(",")[0].trim()) || request.headers.get("x-real-ip") || null;
}

function isPrivateIp(ip) {
  return (
    !ip ||
    ip === "local" ||
    ip === "::1" ||
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^f[cd]/i.test(ip) || // fc00::/7 unique-local
    /^fe80/i.test(ip)
  );
}

export async function countryFromRequest(request) {
  for (const h of GEO_HEADERS) {
    const name = isoToName(request.headers.get(h));
    if (name) return name;
  }
  const ip = clientIp(request);
  if (isPrivateIp(ip)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "bnd-portal/1.0" },
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return isoToName(data && data.country_code);
  } catch {
    return null; // lookup is best-effort — signup never fails on geo
  }
}
