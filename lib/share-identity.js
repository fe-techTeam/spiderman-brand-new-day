// "Share your identity" — the collectible card image + invite text + link,
// aimed first at WhatsApp on iOS/Android. Two constraints shape this module:
//  - The link rides INSIDE `text`: WhatsApp turns shared text into the image
//    caption, and iOS Safari drops a separate `url` member when files are
//    attached — so the text must carry everything.
//  - navigator.share must run within the tap's user-activation window, so
//    callers pre-fetch the card File (fetchCardFile) before the click.
// shareIdentity returns "shared" | "aborted" | "fallback" — "fallback" means
// the caller should surface manual options (WhatsApp link, copy, download).

// Offline fallback — the live template is admin-managed (settings table,
// served by GET /api/share-config). Keep this in sync with the migration 012
// seed value.
export const DEFAULT_SHARE_TEMPLATE =
  "🕸️ I just unmasked my Spider identity — I'm {AvatarIdentity}\n" +
  "Who are YOU under the mask? Reveal yours & find your Web Twins on Spider-Man: Brand New Day 👉 {Link}";

export function identityShareUrl(avatar) {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://spidermania.in";
  return `${origin}/s/${(avatar && avatar.slug) || ""}`;
}

export function identityShareText(avatar, template) {
  const name = String((avatar && avatar.name) || "a Spider").toUpperCase();
  const identity = avatar && avatar.emoji ? `${name} ${avatar.emoji}` : name;
  const url = identityShareUrl(avatar);
  let text = String(template || DEFAULT_SHARE_TEMPLATE)
    .replaceAll("{AvatarIdentity}", identity)
    .replaceAll("{Link}", url);
  // the link is non-negotiable — if an edited template lost it, tack it on
  if (!text.includes(url)) text += `\n👉 ${url}`;
  return text;
}

let templatePromise = null;

/** The admin-managed share template; falls back to the built-in copy. */
export function fetchShareTemplate() {
  if (!templatePromise) {
    templatePromise = fetch("/api/share-config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) =>
        d && typeof d.template === "string" && d.template.trim() ? d.template : DEFAULT_SHARE_TEMPLATE
      )
      .catch(() => {
        templatePromise = null; // retry on the next call
        return DEFAULT_SHARE_TEMPLATE;
      });
  }
  return templatePromise;
}

/** Records a Share click (fire-and-forget; one row per click, by design).
 *  sendBeacon survives the page losing focus to the native share sheet. */
export function logShare() {
  try {
    if (navigator.sendBeacon && navigator.sendBeacon("/api/shares")) return;
  } catch {}
  fetch("/api/shares", { method: "POST", keepalive: true }).catch(() => {});
}

/** The raw card artwork as a File — fallback when compositing fails. */
export async function fetchCardFile(avatar) {
  if (!avatar || !avatar.card) return null;
  const res = await fetch(avatar.card);
  if (!res.ok) return null;
  const blob = await res.blob();
  const ext = (avatar.card.split(".").pop() || "png").toLowerCase();
  return new File([blob], `spider-identity-${avatar.slug || "card"}.${ext}`, {
    type: blob.type || "image/png",
  });
}

/* ---- the shareable card: 1080×1080 composite (client spec) ----------------
   Branded share art as the stage, the avatar card 660px tall centered 220px
   from the top, the Spidey Code 50px under it in the Living Web box styling.
   Drawn on a fixed 1080×1080 canvas so every device — any DPR, iOS or
   Android — exports the identical image. Letter-spacing is drawn by hand:
   ctx.letterSpacing doesn't exist on older iOS Safari. PNG keeps it lossless. */

const SHARE_BG = "/assets/share-card.png";
const SHARE_SIZE = 1080;
const CARD_TOP = 220;
const CARD_HEIGHT = 660;
const CODE_GAP = 50;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

function hexToRgba(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return `rgba(255,58,74,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawSpaced(ctx, text, x, y, spacing) {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  return cursor - spacing - x;
}

function measureSpaced(ctx, text, spacing) {
  let w = 0;
  let n = 0;
  for (const ch of text) {
    w += ctx.measureText(ch).width;
    n += 1;
  }
  return w + Math.max(0, n - 1) * spacing;
}

export async function buildShareCardFile(avatar, spideyCode) {
  if (typeof document === "undefined" || !avatar || !avatar.card) return null;

  const [bg, card] = await Promise.all([loadImage(SHARE_BG), loadImage(avatar.card)]);
  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load("500 22px Oswald"),
        document.fonts.load("600 30px Oswald"),
      ]);
    }
  } catch {}

  const canvas = document.createElement("canvas");
  canvas.width = SHARE_SIZE;
  canvas.height = SHARE_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(bg, 0, 0, SHARE_SIZE, SHARE_SIZE);

  // avatar card: 660px tall, aspect kept, dead center 220px from the top —
  // unusually wide art is bounded to the canvas instead of bleeding off it
  let cardH = CARD_HEIGHT;
  let cardW = (CARD_HEIGHT * card.naturalWidth) / card.naturalHeight;
  const MAX_CARD_W = SHARE_SIZE - 80;
  if (cardW > MAX_CARD_W) {
    cardH = (MAX_CARD_W / cardW) * cardH;
    cardW = MAX_CARD_W;
  }
  const cardX = (SHARE_SIZE - cardW) / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  ctx.drawImage(card, cardX, CARD_TOP, cardW, cardH);
  ctx.restore();

  // Spidey Code, 50px below the card — same treatment as the Living Web box
  if (spideyCode) {
    const heroColor = /^#[0-9a-f]{6}$/i.test(avatar.color || "") ? avatar.color : "#ff3a4a";
    const textTop = CARD_TOP + CARD_HEIGHT + CODE_GAP;
    const LABEL_FONT = "500 22px 'Oswald', sans-serif";
    const CODE_FONT = "600 30px 'Oswald', sans-serif";
    const LABEL_SP = 5.5; // ≈0.25em of 22px
    const CODE_SP = 5.5; // ≈0.18em of 30px
    const GAP = 18;

    ctx.textBaseline = "top";
    ctx.font = LABEL_FONT;
    const labelW = measureSpaced(ctx, "SPIDEY CODE", LABEL_SP);
    ctx.font = CODE_FONT;
    const codeW = measureSpaced(ctx, spideyCode, CODE_SP);
    let x = (SHARE_SIZE - (labelW + GAP + codeW)) / 2;

    ctx.font = LABEL_FONT;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    drawSpaced(ctx, "SPIDEY CODE", x, textTop + 7, LABEL_SP);
    x += labelW + GAP;

    ctx.save();
    ctx.font = CODE_FONT;
    ctx.fillStyle = heroColor;
    ctx.shadowColor = hexToRgba(heroColor, 0.85);
    ctx.shadowBlur = 18;
    drawSpaced(ctx, spideyCode, x, textTop, CODE_SP);
    ctx.restore();
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new File([blob], `spider-identity-${avatar.slug || "card"}.png`, { type: "image/png" });
}

/** Composite first, raw card art as the fallback — never returns a broken share. */
export async function buildBestShareFile(avatar, spideyCode) {
  try {
    const composed = await buildShareCardFile(avatar, spideyCode);
    if (composed) return composed;
  } catch {}
  try {
    return await fetchCardFile(avatar);
  } catch {
    return null;
  }
}

export async function shareIdentity(avatar, file, template) {
  if (typeof navigator === "undefined") return "fallback";
  const text = identityShareText(avatar, template);
  const title = "Spider-Man: Brand New Day";

  // The make-or-break path: image + caption(+link) into the native sheet.
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "aborted";
      // some targets refuse files — fall through to the text-only paths
    }
  }

  // Touch devices without file-share support still get the native sheet;
  // the /s/[slug] OG card makes the link unfurl with the artwork anyway.
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;
  if (coarse && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "aborted";
    }
  }

  return "fallback";
}
