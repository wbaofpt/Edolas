import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

export type WikiMediaKind = "image" | "gif" | "video";
export type WikiMediaValidation = { ok: true; kind: WikiMediaKind; extension: string; mimeType: string } | { ok: false; error: string };
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function validateWikiMedia(bytes: Uint8Array, size: number): WikiMediaValidation {
  let match: Omit<Extract<WikiMediaValidation, { ok: true }>, "ok"> | null = null;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) match = { kind: "image", extension: "png", mimeType: "image/png" };
  else if (bytes.length >= 10 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) match = { kind: "image", extension: "jpg", mimeType: "image/jpeg" };
  else if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") match = { kind: "image", extension: "webp", mimeType: "image/webp" };
  else if (bytes.length >= 10 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) match = { kind: "gif", extension: "gif", mimeType: "image/gif" };
  else if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp" && /^(isom|iso2|avc1|mp41|mp42|M4V )$/.test(ascii(bytes, 8, 12))) match = { kind: "video", extension: "mp4", mimeType: "video/mp4" };
  else if (bytes.length >= 12 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3 && ascii(bytes, 4, Math.min(bytes.length, 4096)).toLowerCase().includes("webm")) match = { kind: "video", extension: "webm", mimeType: "video/webm" };
  if (!match) return { ok: false, error: "Chỉ chấp nhận JPG, PNG, WebP, GIF, MP4 hoặc WebM hợp lệ." };
  const limit = match.kind === "video" ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (size < 4 || size > limit) return { ok: false, error: match.kind === "video" ? "Video không được vượt quá 50 MB." : "Ảnh hoặc GIF không được vượt quá 10 MB." };
  return { ok: true, ...match };
}

export async function saveWikiMediaMetadata(input: { uploaderId: number; pageId: number | null; kind: WikiMediaKind; path: string; originalName: string; mimeType: string; size: number }, db: Pick<Pool, "execute"> = getPool()) {
  const [result] = await db.execute("INSERT INTO wiki_media (page_id, uploader_id, media_type, path, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)", [input.pageId, input.uploaderId, input.kind, input.path, input.originalName.slice(0, 255), input.mimeType, input.size]);
  return Number((result as { insertId: number }).insertId);
}
