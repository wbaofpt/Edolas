import type { WikiMediaKind } from "./media.ts";

export type WikiUploadFileLike = { name: string; size: number; type: string; lastModified: number };
export type WikiUploadedMedia = { id: number; kind: WikiMediaKind; path: string; mimeType: string; size: number };
export type WikiUploadStatus = "queued" | "uploading" | "uploaded" | "error";
export type WikiUploadQueueItem<T extends WikiUploadFileLike = WikiUploadFileLike> = { id: string; file: T; caption: string; progress: number; status: WikiUploadStatus; error: string; media?: WikiUploadedMedia };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

function fileError(file: WikiUploadFileLike) {
  if (!IMAGE_TYPES.has(file.type) && !VIDEO_TYPES.has(file.type)) return "Định dạng tệp không được hỗ trợ.";
  const limit = VIDEO_TYPES.has(file.type) ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  return file.size > limit ? (VIDEO_TYPES.has(file.type) ? "Video tối đa 50 MB." : "Ảnh và GIF tối đa 10 MB.") : "";
}

const fileKey = (file: WikiUploadFileLike) => `${file.name}:${file.size}:${file.lastModified}`;

export function appendWikiUploadFiles<T extends WikiUploadFileLike>(queue: WikiUploadQueueItem<T>[], files: T[], createId = () => crypto.randomUUID()) {
  const keys = new Set(queue.map((item) => fileKey(item.file)));
  const additions = files.filter((file) => { const key = fileKey(file); if (keys.has(key)) return false; keys.add(key); return true; }).map((file) => {
    const error = fileError(file);
    return { id: createId(), file, caption: "", progress: 0, status: error ? "error" as const : "queued" as const, error };
  });
  return [...queue, ...additions];
}

export function updateWikiUploadItem<T extends WikiUploadFileLike>(queue: WikiUploadQueueItem<T>[], id: string, patch: Partial<Omit<WikiUploadQueueItem<T>, "id" | "file">>) {
  return queue.map((item) => item.id === id ? { ...item, ...patch } : item);
}
