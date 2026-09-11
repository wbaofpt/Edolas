"use client";

import { FileImage, Film, ImagePlus, LoaderCircle, Play, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { appendWikiUploadFiles, updateWikiUploadItem, type WikiUploadedMedia, type WikiUploadQueueItem } from "@/lib/wiki/upload-queue";
import { readControlCsrfToken } from "@/lib/control/client";

type PickType = { kind: "image" | "gif" | "video"; accept: string; label: string };
type UploadedMediaWithCaption = WikiUploadedMedia & { caption: string };
const PICKS: PickType[] = [
  { kind: "image", accept: "image/jpeg,image/png,image/webp", label: "Ảnh" },
  { kind: "gif", accept: "image/gif", label: "GIF" },
  { kind: "video", accept: "video/mp4,video/webm", label: "Video" }
];

export function WikiMediaUploader({ pageId, onUploaded }: { pageId?: number; onUploaded: (media: UploadedMediaWithCaption[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<WikiUploadQueueItem<File>[]>([]);
  const [selection, setSelection] = useState(PICKS[0]);
  const [queue, setQueueState] = useState<WikiUploadQueueItem<File>[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function setQueue(next: WikiUploadQueueItem<File>[] | ((current: WikiUploadQueueItem<File>[]) => WikiUploadQueueItem<File>[])) {
    setQueueState((current) => { const value = typeof next === "function" ? next(current) : next; queueRef.current = value; return value; });
  }

  function patchItem(id: string, patch: Partial<Omit<WikiUploadQueueItem<File>, "id" | "file">>) {
    setQueue((current) => updateWikiUploadItem(current, id, patch));
  }

  function choose(type: PickType) { setSelection(type); requestAnimationFrame(() => inputRef.current?.click()); }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setQueue((current) => appendWikiUploadFiles(current, files));
    setMessage(`Đã thêm ${files.length} tệp vào hàng đợi.`);
  }

  function uploadOne(item: WikiUploadQueueItem<File>) {
    return new Promise<WikiUploadedMedia>((resolve, reject) => {
      const data = new FormData(); data.set("file", item.file); if (pageId) data.set("pageId", String(pageId));
      const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/control/wiki/media"); xhr.setRequestHeader("x-control-csrf", readControlCsrfToken());
      xhr.upload.addEventListener("progress", (event) => { if (event.lengthComputable) patchItem(item.id, { progress: Math.round((event.loaded / event.total) * 100) }); });
      xhr.addEventListener("load", () => { const body = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })(); if (xhr.status >= 200 && xhr.status < 300) resolve(body.media as WikiUploadedMedia); else reject(new Error(body.error ?? "Không thể tải media.")); });
      xhr.addEventListener("error", () => reject(new Error("Mất kết nối khi tải media.")));
      xhr.send(data);
    });
  }

  async function uploadItems(ids: string[]) {
    if (busy || !ids.length) return;
    setBusy(true); setMessage("");
    const completed: UploadedMediaWithCaption[] = [];
    for (const id of ids) {
      const item = queueRef.current.find((entry) => entry.id === id);
      if (!item || (item.status !== "queued" && item.status !== "error")) continue;
      patchItem(id, { status: "uploading", progress: 0, error: "" });
      try {
        const media = await uploadOne(item);
        patchItem(id, { status: "uploaded", progress: 100, media });
        completed.push({ ...media, caption: queueRef.current.find((entry) => entry.id === id)?.caption ?? item.caption });
      } catch (error) {
        patchItem(id, { status: "error", progress: 0, error: error instanceof Error ? error.message : "Không thể tải media." });
      }
    }
    setBusy(false);
    if (completed.length) onUploaded(completed);
    const failed = ids.length - completed.length;
    setMessage(failed ? `Đã chèn ${completed.length} tệp. ${failed} tệp cần kiểm tra hoặc thử lại.` : `Đã tải và chèn ${completed.length}/${ids.length} tệp.`);
  }

  const readyIds = queue.filter((item) => item.status === "queued").map((item) => item.id);
  const uploadedCount = queue.filter((item) => item.status === "uploaded").length;
  return <section className="wiki-media-uploader" aria-labelledby="wiki-media-title" aria-busy={busy}><div className="wiki-media-uploader-head"><span className="wiki-media-uploader-icon"><UploadCloud className="h-5 w-5" aria-hidden="true" /></span><span><h3 id="wiki-media-title">Hàng đợi media</h3><p>Chọn nhiều tệp, thêm chú thích rồi tải tuần tự.</p></span><strong>{uploadedCount}/{queue.length}</strong></div><div className="wiki-media-actions">{PICKS.map((type) => <button key={type.kind} type="button" disabled={busy} onClick={() => choose(type)} className="wiki-media-button focus-ring">{type.kind === "image" ? <ImagePlus className="h-4 w-4" aria-hidden="true" /> : type.kind === "gif" ? <FileImage className="h-4 w-4" aria-hidden="true" /> : <Film className="h-4 w-4" aria-hidden="true" />}{type.label}</button>)}</div><input ref={inputRef} type="file" accept={selection.accept} onChange={addFiles} multiple hidden />{queue.length ? <ul className="wiki-upload-queue-list" aria-label="Các media chờ tải">{queue.map((item) => <li key={item.id} className={`wiki-upload-queue-item is-${item.status}`}><span className="wiki-upload-file-icon">{item.file.type.startsWith("video/") ? <Film className="h-4 w-4" aria-hidden="true" /> : <FileImage className="h-4 w-4" aria-hidden="true" />}</span><div className="wiki-upload-file-main"><div className="wiki-upload-file-meta"><strong title={item.file.name}>{item.file.name}</strong><span>{formatBytes(item.file.size)} · {statusLabel(item.status)}</span></div><label><span className="sr-only">Chú thích cho {item.file.name}</span><input value={item.caption} disabled={item.status === "uploading" || item.status === "uploaded"} onChange={(event) => patchItem(item.id, { caption: event.target.value.slice(0, 300) })} placeholder="Thêm chú thích..." className="focus-ring" /></label>{item.status === "uploading" || item.progress > 0 ? <div className="wiki-upload-track" role="progressbar" aria-label={`Tiến trình ${item.file.name}`} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ transform: `scaleX(${item.progress / 100})` }} /></div> : null}{item.error ? <p className="wiki-upload-item-error">{item.error}</p> : null}</div><div className="wiki-upload-item-actions">{item.status === "error" ? <button type="button" disabled={busy || !isRetryable(item)} onClick={() => uploadItems([item.id])} aria-label={`Thử lại ${item.file.name}`} className="wiki-upload-icon-button focus-ring"><RotateCcw className="h-4 w-4" aria-hidden="true" /></button> : null}{item.status === "queued" || item.status === "error" ? <button type="button" disabled={busy} onClick={() => setQueue((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Xóa ${item.file.name} khỏi hàng đợi`} className="wiki-upload-icon-button focus-ring"><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}{item.status === "uploading" ? <LoaderCircle className="h-4 w-4 animate-spin text-[#67E8F9]" aria-label="Đang tải" /> : null}</div></li>)}</ul> : <p className="wiki-upload-empty">Chưa có media. Bạn có thể chọn nhiều tệp trong mỗi lần.</p>}<div className="wiki-upload-footer"><p className="wiki-upload-message" role="status" aria-live="polite">{message}</p><button type="button" disabled={busy || !readyIds.length} onClick={() => uploadItems(readyIds)} className="wiki-upload-start focus-ring"><Play className="h-4 w-4" aria-hidden="true" />{busy ? "Đang tải tuần tự..." : `Tải ${readyIds.length} tệp`}</button></div></section>;
}

const formatBytes = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const statusLabel = (status: WikiUploadQueueItem<File>["status"]) => ({ queued: "Chờ tải", uploading: "Đang tải", uploaded: "Đã tải", error: "Lỗi" })[status];
const isRetryable = (item: WikiUploadQueueItem<File>) => item.error !== "Định dạng tệp không được hỗ trợ." && !item.error.includes("tối đa");
