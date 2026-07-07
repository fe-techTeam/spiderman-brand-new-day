// Upload pipeline: magic-byte validation (never trust extension/Content-Type),
// per-kind size caps, light image compression via sharp, randomized keys,
// storage via lib/server/storage.js (local disk or S3 — env-switchable).
// Files are only reachable through the status-checking media routes.
//
//   MAX_IMAGE_UPLOAD_MB (default 5) · MAX_VIDEO_UPLOAD_MB (default 50)

import crypto from "node:crypto";
import sharp from "sharp";
import { putObject } from "@/lib/server/storage";

export function maxImageBytes() {
  return Number(process.env.MAX_IMAGE_UPLOAD_MB || 5) * 1024 * 1024;
}
export function maxVideoBytes() {
  return Number(process.env.MAX_VIDEO_UPLOAD_MB || 50) * 1024 * 1024;
}

const IMAGE_SIGS = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/gif", ext: "gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

const VIDEO_SIGS = [
  // MP4/MOV family: "ftyp" box at offset 4.
  {
    mime: "video/mp4",
    ext: "mp4",
    test: (b) => b.length > 11 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
  // WebM/Matroska: EBML header.
  {
    mime: "video/webm",
    ext: "webm",
    test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  },
];

export function sniff(buffer, { allowVideo = false } = {}) {
  if (buffer.length < 12) return null;
  const img = IMAGE_SIGS.find((s) => s.test(buffer));
  if (img) return { ...img, kind: "image" };
  if (allowVideo) {
    const vid = VIDEO_SIGS.find((s) => s.test(buffer));
    if (vid) return { ...vid, kind: "video" };
  }
  return null;
}

/** Light compression: cap the long edge at 1920px and re-encode at ~q82.
    GIFs pass through (re-encoding kills animation). Falls back to the original
    buffer if sharp can't process the file. */
async function compressImage(buffer, sig) {
  if (sig.mime === "image/gif") return { buffer, width: null, height: null };
  try {
    const img = sharp(buffer, { failOn: "error" }).rotate(); // honor EXIF orientation
    const pipeline = img.resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true });
    let out;
    if (sig.mime === "image/png") out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    else if (sig.mime === "image/webp") out = await pipeline.webp({ quality: 82 }).toBuffer();
    else out = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    // Occasionally a tiny already-optimized file grows — keep the smaller one.
    const finalBuf = out.length < buffer.length ? out : buffer;
    const meta = await sharp(finalBuf).metadata();
    return { buffer: finalBuf, width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    return { buffer, width: null, height: null };
  }
}

/**
 * Validates, (for images) lightly compresses, and stores an uploaded File.
 * Returns { key, storage, mime, size, kind, width, height } or throws an
 * Error with a user-safe message.
 */
export async function saveUpload(file, subdir, { allowVideo = false } = {}) {
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("No file uploaded");

  // Cheap pre-check before buffering (the strict per-kind check runs after sniffing).
  const preCap = allowVideo ? Math.max(maxImageBytes(), maxVideoBytes()) : maxImageBytes();
  if (file.size > preCap) {
    throw new Error(`File too large (max ${Math.round(preCap / 1024 / 1024)} MB)`);
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  const sig = sniff(buffer, { allowVideo });
  if (!sig) {
    throw new Error(
      allowVideo
        ? "Only JPEG, PNG, WebP, GIF images or MP4/WebM videos are allowed"
        : "Only JPEG, PNG, WebP or GIF images are allowed"
    );
  }

  const cap = sig.kind === "video" ? maxVideoBytes() : maxImageBytes();
  if (buffer.length > cap) {
    throw new Error(
      `${sig.kind === "video" ? "Video" : "Image"} too large (max ${Math.round(cap / 1024 / 1024)} MB)`
    );
  }

  let width = null;
  let height = null;
  if (sig.kind === "image") {
    ({ buffer, width, height } = await compressImage(buffer, sig));
  }

  const key = `${subdir}/${crypto.randomBytes(16).toString("hex")}.${sig.ext}`;
  const storage = await putObject(key, buffer, sig.mime);
  return { key, storage, mime: sig.mime, size: buffer.length, kind: sig.kind, width, height };
}

// Back-compat wrapper (fan art: images only).
export async function saveImageUpload(file, subdir) {
  const saved = await saveUpload(file, subdir, { allowVideo: false });
  return { filePath: saved.key, mime: saved.mime, size: saved.size, storage: saved.storage };
}
