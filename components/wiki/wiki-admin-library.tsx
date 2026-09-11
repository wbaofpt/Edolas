"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, FilePlus2, Pencil, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WikiAdminPage, WikiCluster } from "@/lib/wiki/service";
import { controlFetch } from "@/lib/control/client";
import { WikiConfirmDialog } from "./wiki-confirm-dialog";

type Props = { pages: WikiAdminPage[]; clusters: WikiCluster[]; filters: { query: string; cluster: string; status: string } };

export function WikiAdminLibrary({ pages, clusters, filters }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<WikiAdminPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const published = pages.filter((page) => page.isPublished).length;

  async function deletePage() {
    if (!deleting) return;
    setBusy(true); setMessage("");
    try {
      const response = await controlFetch(`/api/control/wiki/pages/${deleting.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Không thể xóa bài Wiki.");
      setDeleting(null); setMessage("Đã xóa bài Wiki."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xóa bài Wiki."); }
    finally { setBusy(false); }
  }

  return <div><div className="wiki-admin-stats"><div><span>Tổng bài</span><strong>{pages.length}</strong></div><div><span>Đã xuất bản</span><strong>{published}</strong></div><div><span>Bản nháp</span><strong>{pages.length - published}</strong></div><div><span>Cụm Wiki</span><strong>{clusters.length}</strong></div></div><section className="wiki-admin-surface mt-5"><div className="wiki-admin-toolbar"><form action="/control/wiki" className="wiki-admin-filters"><label className="wiki-search-field"><Search className="h-4 w-4" /><span className="sr-only">Tìm bài Wiki</span><input name="query" defaultValue={filters.query} placeholder="Tìm tiêu đề hoặc slug..." /></label><label><span className="sr-only">Lọc theo cụm</span><select name="cluster" defaultValue={filters.cluster}><option value="">Tất cả cụm</option>{clusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.name}</option>)}</select></label><label><span className="sr-only">Lọc theo trạng thái</span><select name="status" defaultValue={filters.status}><option value="all">Mọi trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select></label><button className="server-button server-button-dark px-4 py-3 focus-ring">Áp dụng</button></form><Link href="/control/wiki/new" className="server-button px-5 py-3 focus-ring"><FilePlus2 className="h-4 w-4" />Tạo bài mới</Link></div><p className="px-5 pb-2 text-sm text-[#94A3B8]" aria-live="polite">{message || `Tìm thấy ${pages.length} bài viết.`}</p><div className="wiki-admin-list">{pages.length ? pages.map((page) => <article key={page.id} className="wiki-admin-row"><div className="wiki-admin-row-icon"><BookOpen className="h-5 w-5" /></div><div className="wiki-admin-row-main"><div className="flex flex-wrap items-center gap-2"><h2>{page.title}</h2><span className={`wiki-status ${page.isPublished ? "is-published" : "is-draft"}`}>{page.isPublished ? "Đã xuất bản" : "Bản nháp"}</span></div><p>/{page.slug}</p><span>{page.summary}</span></div><dl className="wiki-admin-meta"><div><dt>Cụm</dt><dd>{page.clusterName}</dd></div><div><dt>Thứ tự</dt><dd>{page.sortOrder ?? 0}</dd></div><div><dt>Cập nhật</dt><dd>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(page.updatedAt))}</dd></div></dl><div className="wiki-admin-row-actions">{page.isPublished ? <Link href={`/wiki/${page.slug}`} target="_blank" aria-label={`Xem ${page.title}`} className="wiki-icon-button focus-ring"><ExternalLink className="h-4 w-4" /></Link> : null}<Link href={`/control/wiki/${page.id}`} aria-label={`Sửa ${page.title}`} className="wiki-icon-button focus-ring"><Pencil className="h-4 w-4" /></Link><button type="button" aria-label={`Xóa ${page.title}`} onClick={() => setDeleting(page)} className="wiki-icon-button is-danger focus-ring"><Trash2 className="h-4 w-4" /></button></div></article>) : <div className="wiki-admin-empty"><Search className="h-8 w-8" /><h2>Không tìm thấy bài viết</h2><p>Thử thay đổi từ khóa hoặc bộ lọc hiện tại.</p></div>}</div></section><WikiConfirmDialog open={Boolean(deleting)} title="Đưa bài vào thùng rác?" description={deleting ? `Bài “${deleting.title}” sẽ được giữ trong thùng rác 30 ngày và có thể khôi phục tại Trung tâm nội dung.` : ""} busy={busy} onCancel={() => setDeleting(null)} onConfirm={deletePage} /></div>;
}
