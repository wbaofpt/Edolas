"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Eye, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { buildWikiMediaGroupToken, insertWikiMediaAtSelection } from "@/lib/wiki/content";
import { controlFetch } from "@/lib/control/client";
import type { WikiUploadedMedia } from "@/lib/wiki/upload-queue";
import type { WikiAdminPageDetail, WikiCluster } from "@/lib/wiki/service";
import { WikiContentRenderer } from "./wiki-content-renderer";
import { WikiMediaUploader } from "./wiki-media-uploader";

type UploadedMedia = WikiUploadedMedia & { caption: string };

export function WikiArticleEditor({ clusters, page }: { clusters: WikiCluster[]; page?: WikiAdminPageDetail }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(page?.body ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const editing = Boolean(page);

  function insertMedia(media: UploadedMedia[]) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? start;
    const token = buildWikiMediaGroupToken(media);
    let cursor = start;
    setBody((current) => { const next = insertWikiMediaAtSelection(current, start, end, token); cursor = next.cursor; return next.content; });
    requestAnimationFrame(() => { textarea?.focus(); textarea?.setSelectionRange(cursor, cursor); });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const payload = { clusterId: Number(data.get("clusterId")), title: data.get("title"), slug: data.get("slug"), summary: data.get("summary"), body, isPublished: data.get("isPublished") === "on", sortOrder: Number(data.get("sortOrder")) };
    try {
      const response = await controlFetch(editing ? `/api/control/wiki/pages/${page?.id}` : "/api/control/wiki/pages", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Không thể lưu bài Wiki.");
      if (!editing) { router.push(`/control/wiki/${result.pageId}`); return; }
      setMessage("Đã lưu thay đổi."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu bài Wiki."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save}><div className="wiki-editor-topbar"><Link href="/control/wiki" className="wiki-editor-back focus-ring"><ArrowLeft className="h-4 w-4" />Thư viện bài viết</Link><div className="flex items-center gap-2">{page?.isPublished ? <Link href={`/wiki/${page.slug}`} target="_blank" className="server-button server-button-dark px-4 py-3 focus-ring"><ExternalLink className="h-4 w-4" />Xem bài</Link> : null}<button disabled={busy} className="server-button px-5 py-3 focus-ring"><Save className="h-4 w-4" />{busy ? "Đang lưu..." : "Lưu bài"}</button></div></div><div className="wiki-editor-layout"><main className="wiki-admin-surface p-5 sm:p-7"><div className="wiki-form-field"><label htmlFor="wiki-title">Tiêu đề bài viết</label><p>Tên rõ ràng giúp thành viên tìm đúng hướng dẫn.</p><input id="wiki-title" name="title" defaultValue={page?.title} minLength={4} maxLength={160} required className="wiki-input focus-ring" /></div><div className="wiki-form-field"><label htmlFor="wiki-summary">Tóm tắt</label><p>Một câu mô tả ngắn xuất hiện trong danh sách Wiki.</p><textarea id="wiki-summary" name="summary" defaultValue={page?.summary} minLength={8} maxLength={500} rows={3} required className="wiki-input resize-y focus-ring" /></div><div className="wiki-form-field"><div className="wiki-content-label"><span><label htmlFor="wiki-body">Nội dung</label><p>Đặt con trỏ rồi chèn ảnh, GIF hoặc video ngay vào bài.</p></span><button type="button" className={`wiki-preview-toggle focus-ring ${showPreview ? "is-active" : ""}`} onClick={() => setShowPreview((value) => !value)} aria-pressed={showPreview}><Eye className="h-4 w-4" />{showPreview ? "Ẩn xem trước" : "Xem trước"}</button></div><textarea ref={textareaRef} id="wiki-body" name="body" value={body} onChange={(event) => setBody(event.target.value)} minLength={20} maxLength={100000} rows={20} required className="wiki-input wiki-content-editor resize-y focus-ring" /></div><WikiMediaUploader pageId={page?.id} onUploaded={insertMedia} />{showPreview ? <section className="wiki-editor-preview" aria-label="Xem trước bài Wiki"><div className="wiki-editor-preview-head"><span>Live preview</span><strong>Bản xem trước bài viết</strong></div><WikiContentRenderer content={body} preview /></section> : null}</main><aside className="wiki-editor-sidebar"><section className="wiki-admin-surface p-5"><h2 className="wiki-editor-section-title">Xuất bản</h2><label className="wiki-publish-toggle"><input name="isPublished" type="checkbox" defaultChecked={page?.isPublished ?? true} /><span><strong>Hiển thị công khai</strong><small>Tắt để lưu thành bản nháp.</small></span></label></section><section className="wiki-admin-surface p-5"><h2 className="wiki-editor-section-title">Phân loại</h2><div className="wiki-form-field"><label htmlFor="wiki-cluster">Cụm Wiki</label><select id="wiki-cluster" name="clusterId" defaultValue={page?.clusterId ?? ""} required className="wiki-input focus-ring"><option value="">Chọn cụm</option>{clusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.name}</option>)}</select></div><div className="wiki-form-field"><label htmlFor="wiki-order">Thứ tự</label><input id="wiki-order" name="sortOrder" type="number" defaultValue={page?.sortOrder ?? 0} className="wiki-input focus-ring" /></div></section><section className="wiki-admin-surface p-5"><h2 className="wiki-editor-section-title">Đường dẫn</h2><div className="wiki-form-field"><label htmlFor="wiki-slug">Slug</label><p>Chỉ dùng chữ thường, số và dấu gạch ngang.</p><div className="wiki-slug-field"><span>/wiki/</span><input id="wiki-slug" name="slug" defaultValue={page?.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} required /></div></div></section></aside></div><p className="wiki-save-status" aria-live="polite">{message}</p></form>;
}
