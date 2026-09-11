"use client";

/* Local object URLs are used for instant previews before upload. */
/* eslint-disable @next/next/no-img-element */

import { ImagePlus, LoaderCircle, Send, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { ForumCategory } from "@/lib/forum/service";

type UploadedMedia = { kind: "image" | "gif" | "video"; path: string; name: string };

function MediaPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const nextUrl = URL.createObjectURL(file); setUrl(nextUrl); return () => URL.revokeObjectURL(nextUrl); }, [file]);
  if (!url) return <span className="forum-media-preview forum-media-preview-empty" aria-hidden="true" />;
  return file.type.startsWith("video/")
    ? <video className="forum-media-preview" src={url} muted preload="metadata" aria-label={`Xem trước ${file.name}`} />
    : <img className="forum-media-preview" src={url} alt={`Xem trước ${file.name}`} />;
}

export function NewTopicForm({ categories }: { categories: ForumCategory[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles((current) => [...current, ...Array.from(event.target.files ?? [])].slice(0, 12));
    event.target.value = "";
  }

  async function upload(file: File): Promise<UploadedMedia> {
    const form = new FormData(); form.set("file", file);
    const response = await fetch("/api/forum/media", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Không thể tải media.");
    return { kind: body.media.kind, path: body.media.path, name: file.name };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const media = await Promise.all(files.map(upload));
      const text = String(data.get("content") ?? "").trim();
      const tokens = media.map((item) => `[[${item.kind}:${item.path}|${item.name.slice(0, 120)}]]`).join("\n\n");
      const response = await fetch("/api/forum/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: Number(data.get("categoryId")), title: data.get("title"), content: tokens ? `${text}\n\n${tokens}` : text }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Không thể đăng bài.");
      router.push(`/forum/${body.topicId}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đăng bài."); } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="profile-panel space-y-5 p-5 sm:p-7">
    <label className="block text-sm font-bold">Chuyên mục<select name="categoryId" required className="mt-2 w-full border border-[#38BDF8]/25 bg-[#080B18] px-4 py-3 focus-ring"><option value="">Chọn chuyên mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
    <label className="block text-sm font-bold">Tiêu đề<input name="title" minLength={8} maxLength={200} required className="mt-2 w-full border border-[#38BDF8]/25 bg-[#080B18] px-4 py-3 focus-ring" /></label>
    <label className="block text-sm font-bold">Nội dung<textarea name="content" minLength={20} maxLength={30000} rows={12} required className="mt-2 w-full resize-y border border-[#38BDF8]/25 bg-[#080B18] px-4 py-3 leading-7 focus-ring" /></label>
    <div className="forum-media-picker"><p className="font-bold text-[#E0F2FE]">Media bài viết</p><p className="mt-1 text-xs text-[#94A3B8]">Thêm tối đa 12 ảnh, GIF, MP4 hoặc WebM. Ảnh tối đa 10 MB, video tối đa 50 MB.</p><label className="server-button server-button-dark mt-3 inline-flex cursor-pointer px-4 py-3 text-sm focus-ring"><ImagePlus className="h-4 w-4" />Chọn nhiều tệp<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple onChange={addFiles} className="sr-only" /></label>{files.length ? <ul className="forum-media-list" aria-label="Tệp media đã chọn">{files.map((file, index) => <li key={`${file.name}-${file.size}-${index}`}><MediaPreview file={file} /><span>{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Xóa ${file.name}`}>X</button></li>)}</ul> : null}</div>
    <button disabled={busy} className="server-button px-5 py-3 focus-ring">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busy ? "Đang đăng..." : "Đăng chủ đề"}</button><p aria-live="polite" className="text-sm text-[#94A3B8]">{message}</p>
  </form>;
}
