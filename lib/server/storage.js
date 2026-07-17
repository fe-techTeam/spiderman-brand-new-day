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
import { mkdir, unlink, writeFile } from "node:fs/promises";
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
 * Parses an HTTP Range header into { start, end } (either may be null:
 * "bytes=500-" → { 500, null }, suffix "bytes=-500" → { null, 500 }).
 * Returns null for absent/malformed/multi-range headers — per spec a server
 * may ignore Range and serve the full body with a 200.
 */
export function parseRangeHeader(header) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  const start = m[1] === "" ? null : Number(m[1]);
  const end = m[2] === "" ? null : Number(m[2]);
  if (start !== null && end !== null && end < start) return null;
  return { start, end };
}

/**
 * Opens the stored object of a media row ({ file_path, storage }), optionally
 * a byte range of it (a parseRangeHeader() result — video seeking / iOS).
 * Returns null if the object is missing, otherwise:
 *   { stream, size, total, range }
 *     stream — WebReadableStream of the (partial) body
 *     size   — byte length of this body (null only for un-ranged S3 objects
 *              that didn't report ContentLength)
 *     total  — full object size
 *     range  — { start, end } actually served, or null when the full object
 *   { unsatisfiable: true, total }  — range starts past EOF (HTTP 416)
 */
export async function getObjectStream(mediaRow, range = null) {
  if (mediaRow.storage === "s3") {
    try {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const res = await (await s3()).send(
        new GetObjectCommand({
          Bucket: s3Bucket(),
          Key: mediaRow.file_path,
          // S3 takes the header syntax as-is, suffix ranges included
          ...(range ? { Range: `bytes=${range.start ?? ""}-${range.end ?? ""}` } : {}),
        })
      );
      const stream = res.Body.transformToWebStream();
      const cr = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(res.ContentRange || "");
      if (cr) {
        return {
          stream,
          size: res.ContentLength ?? Number(cr[2]) - Number(cr[1]) + 1,
          total: Number(cr[3]),
          range: { start: Number(cr[1]), end: Number(cr[2]) },
        };
      }
      // no ContentRange → S3 served the whole object
      return { stream, size: res.ContentLength ?? null, total: res.ContentLength ?? null, range: null };
    } catch (err) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) return null;
      if (err?.name === "InvalidRange" || err?.$metadata?.httpStatusCode === 416) {
        return { unsatisfiable: true, total: null };
      }
      throw err;
    }
  }
  const abs = path.resolve(uploadRoot(), mediaRow.file_path);
  if (!abs.startsWith(uploadRoot() + path.sep) || !existsSync(abs)) return null;
  const { size: total } = await stat(abs);
  if (range) {
    let start, end;
    if (range.start === null) {
      // suffix range: the last `end` bytes
      start = Math.max(0, total - range.end);
      end = total - 1;
    } else {
      start = range.start;
      end = range.end === null ? total - 1 : Math.min(range.end, total - 1);
    }
    if (start >= total) return { unsatisfiable: true, total };
    return {
      stream: Readable.toWeb(createReadStream(abs, { start, end })),
      size: end - start + 1,
      total,
      range: { start, end },
    };
  }
  return { stream: Readable.toWeb(createReadStream(abs)), size: total, total, range: null };
}

/**
 * Removes the stored object of a media row ({ file_path, storage }).
 * Best-effort: a missing file is fine (the DB row is the source of truth,
 * so callers delete rows first and tidy the bytes after).
 */
export async function deleteObject(mediaRow) {
  if (mediaRow.storage === "s3") {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(
      new DeleteObjectCommand({ Bucket: s3Bucket(), Key: mediaRow.file_path })
    );
    return;
  }
  const abs = path.resolve(uploadRoot(), mediaRow.file_path);
  if (!abs.startsWith(uploadRoot() + path.sep)) throw new Error("Bad storage key");
  await unlink(abs).catch(() => {});
}
