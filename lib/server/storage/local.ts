import { randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError, notFound } from "../http/errors";

/**
 * Local-disk storage behind a tiny interface (`put` / `get`).
 * For production swap the body for an S3-compatible client; callers only see opaque keys.
 */
const ROOT = path.resolve(process.env.UPLOAD_DIR ?? ".data/uploads");
const LIMITS = { image: 5 * 1024 * 1024, audio: 15 * 1024 * 1024, video: 50 * 1024 * 1024 };
const TYPES: Record<string, { kind: keyof typeof LIMITS; ext: string }> = {
  "image/png": { kind: "image", ext: "png" }, "image/jpeg": { kind: "image", ext: "jpg" }, "image/webp": { kind: "image", ext: "webp" },
  "audio/mpeg": { kind: "audio", ext: "mp3" }, "audio/mp4": { kind: "audio", ext: "m4a" }, "audio/wav": { kind: "audio", ext: "wav" }, "audio/webm": { kind: "audio", ext: "weba" }, "audio/ogg": { kind: "audio", ext: "ogg" },
  "video/mp4": { kind: "video", ext: "mp4" }, "video/webm": { kind: "video", ext: "webm" }, "video/quicktime": { kind: "video", ext: "mov" },
};
const MIME_BY_EXT = Object.fromEntries(Object.entries(TYPES).map(([m, v]) => [v.ext, m]));

/** Cheap magic-byte check so a renamed file can't masquerade as an image. */
function sniffOk(mime: string, b: Buffer) {
  if (mime === "image/png") return b.subarray(0, 4).toString("hex") === "89504e47";
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8;
  if (mime === "image/webp") return b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  return true;
}

export async function putUpload(file: File, userId: string) {
  const t = TYPES[file.type];
  if (!t) throw new ApiError(415, "bad_type", "این نوع فایل پشتیبانی نمی‌شود (تصویر png/jpg/webp، صدا mp3/m4a/wav، ویدئو mp4/webm).");
  if (file.size > LIMITS[t.kind]) throw new ApiError(413, "too_big", `حجم فایل بیشتر از حد مجاز (${LIMITS[t.kind] / 1024 / 1024} مگابایت) است.`);
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffOk(file.type, buf)) throw new ApiError(415, "bad_content", "محتوای فایل با نوعش نمی‌خواند.");
  const key = `${userId.slice(0, 8)}/${randomBytes(12).toString("hex")}.${t.ext}`;
  const full = path.join(ROOT, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf);
  return { key, url: `/api/files/${key}`, kind: t.kind, size: buf.length };
}

export async function getUpload(key: string) {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw notFound("فایل");
  try { await stat(full); } catch { throw notFound("فایل"); }
  const ext = path.extname(full).slice(1);
  return { data: await readFile(full), mime: MIME_BY_EXT[ext] ?? "application/octet-stream" };
}
