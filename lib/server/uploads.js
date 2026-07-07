// Upload pipeline: magic-byte validation (never trust extension/Content-Type),
// size cap, randomized names, storage OUTSIDE public/ so unapproved files are
// only reachable through the status-checking media routes. BACKEND.md §10.

import { mkdir, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const SIGNATURES = [
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

export function sniffImage(buffer) {
  if (buffer.length < 12) return null;
  return SIGNATURES.find((s) => s.test(buffer)) || null;
}

/**
 * Validates and persists an uploaded image File (from formData).
 * Returns { filePath (relative to upload root), mime, size } or throws
 * Error with a user-safe message.
 */
export async function saveImageUpload(file, subdir) {
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("No file uploaded");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image too large (max 5 MB)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const sig = sniffImage(buffer);
  if (!sig) throw new Error("Only JPEG, PNG, WebP or GIF images are allowed");

  const name = `${crypto.randomBytes(16).toString("hex")}.${sig.ext}`;
  const relPath = path.join(subdir, name);
  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
  const absDir = path.join(uploadRoot, subdir);
  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, name), buffer);

  return { filePath: relPath, mime: sig.mime, size: buffer.length };
}
