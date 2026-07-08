// Storage abstraction: every upload goes through putObject/getObjectStream so
// switching from local disk to S3 is a .env change (STORAGE_DRIVER=s3 + the
// S3_* vars) — no code changes. Each media row records which driver stored it,
// so files uploaded before a switch keep working. See BACKEND.md §10.
//
//   STORAGE_DRIVER=local (default) | s3
//   S3_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
//   S3_ENDPOINT (optional — set for Cloudflare R2 / MinIO), S3_FORCE_PATH_STYLE
//
// Files are NEVER exposed via public bucket URLs — the bucket stays private and
// /api/media/[id] remains the single gateway (it enforces approval/ownership).

import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export function activeDriver() {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

function uploadRoot() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
}

// ── S3 client (lazy — the SDK is only loaded/configured when actually used) ──
let s3Client = null;
async function s3() {
  if (!s3Client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3Client;
}

function s3Bucket() {
  const b = process.env.S3_BUCKET_NAME;
  if (!b) throw new Error("S3_BUCKET_NAME is not set (STORAGE_DRIVER=s3)");
  return b;
}

/** Stores a buffer under `key`. Returns the driver name that holds it. */
export async function putObject(key, buffer, mime) {
  if (activeDriver() === "s3") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(
      new PutObjectCommand({ Bucket: s3Bucket(), Key: key, Body: buffer, ContentType: mime })
    );
    return "s3";
  }
  const abs = path.resolve(uploadRoot(), key);
  if (!abs.startsWith(uploadRoot() + path.sep)) throw new Error("Bad storage key");
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return "local";
}

/**
 * Opens the stored object of a media row ({ file_path, storage }).
 * Returns { stream: WebReadableStream, size: number|null } or null if missing.
 */
export async function getObjectStream(mediaRow) {
  if (mediaRow.storage === "s3") {
    try {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const res = await (await s3()).send(
        new GetObjectCommand({ Bucket: s3Bucket(), Key: mediaRow.file_path })
      );
      return { stream: res.Body.transformToWebStream(), size: res.ContentLength ?? null };
    } catch (err) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }
  const abs = path.resolve(uploadRoot(), mediaRow.file_path);
  if (!abs.startsWith(uploadRoot() + path.sep) || !existsSync(abs)) return null;
  const { size } = await stat(abs);
  return { stream: Readable.toWeb(createReadStream(abs)), size };
}
