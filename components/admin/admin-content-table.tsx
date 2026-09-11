"use client";

import { Eye, FileEdit, Pin, PinOff, RotateCcw, Search, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { canManageUsers } from "@/lib/admin/authorization";
import type { ForumCategory } from "@/lib/admin/forum-categories";
import type { AdminContentItem, ContentKind } from "@/lib/admin/service";
import { controlFetch } from "@/lib/control/client";
import type { WikiCluster } from "@/lib/wiki/service";

type Props = {
  items: AdminContentItem[];
  categories: ForumCategory[];
  clusters: WikiCluster[];
  actorRole: string;
  trash: boolean;
  filters: { query: string; kind: "all" | ContentKind; status: string };
};

export function AdminContentTable({ items, categories, clusters, actorRole, trash, filters }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminContentItem | null>(null);
  const [preview, setPreview] = useState<AdminContentItem | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const key = (item: AdminContentItem) => `${item.kind}:${item.id}`;
  const allChecked = items.length > 0 && items.every((item) => checked.includes(key(item)));

  async function request(url: string, body: object, method = "PATCH") {
    setBusy(true); setMessage("");
    try {
      const response = await controlFetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setMessage("Đã cập nhật nội dung."); setSelected(null); setConfirmation(""); setChecked([]); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể cập nhật nội dung."); }
    finally { setBusy(false); }
  }

  function mutate(item: AdminContentItem, action: string) {
    return request(`/api/control/content/${item.kind}/${item.id}`, { action, confirmation });
  }

  function operation(item: AdminContentItem, payload: object) {
    return request(`/api/control/content/${item.kind}/${item.id}/operation`, payload);
  }

  function bulk() {
    const entries = checked.map((value) => { const [kind, id] = value.split(":"); return { kind, id: Number(id) }; });
    return request("/api/control/content/bulk", { action: trash ? "restore" : "trash", items: entries });
  }

  function toggleAll() { setChecked(allChecked ? [] : items.map(key)); }
  function toggle(item: AdminContentItem) { const value = key(item); setChecked((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]); }

  return <div className="space-y-4">
    <section aria-label="Tổng quan nội dung" className="grid gap-px border border-[#38BDF8]/15 bg-[#38BDF8]/10 sm:grid-cols-4">
      <Metric label="Đang hiển thị" value={items.length} />
      <Metric label="Bài diễn đàn" value={items.filter((item) => item.kind === "forum").length} />
      <Metric label="Bài Wiki" value={items.filter((item) => item.kind === "wiki").length} />
      <Metric label="Tệp media" value={items.filter((item) => item.kind === "media").length} />
    </section>

    <div className="border border-[#38BDF8]/15 bg-[#0D1225] p-4">
      <div className="flex flex-wrap gap-2" aria-label="Trạng thái nội dung">
        <Link href="/control/content" className={`server-button server-button-dark px-4 py-2 ${!trash ? "border-[#67E8F9]/50" : ""}`}>Đang hoạt động</Link>
        <Link href="/control/content?trash=1" className={`server-button server-button-dark px-4 py-2 ${trash ? "border-[#67E8F9]/50" : ""}`}>Thùng rác</Link>
      </div>
      <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_190px_210px_auto]">
        {trash ? <input type="hidden" name="trash" value="1" /> : null}
        <label className="relative"><span className="sr-only">Tìm nội dung</span><Search className="absolute left-3 top-3.5 size-4 text-[#94A3B8]" aria-hidden="true" /><input name="query" defaultValue={filters.query} aria-label="Tìm nội dung" placeholder="Tìm nội dung, tác giả hoặc tên tệp..." className="h-11 w-full border border-[#38BDF8]/20 bg-[#080B18] pl-10 pr-3 text-[#F8FAFC] focus-ring" /></label>
        <label><span className="sr-only">Lọc loại nội dung</span><select name="kind" defaultValue={filters.kind} className="h-11 w-full border border-[#38BDF8]/20 bg-[#080B18] px-3 text-[#F8FAFC] focus-ring"><option value="all">Mọi loại</option><option value="forum">Diễn đàn</option><option value="wiki">Wiki</option><option value="media">Media</option></select></label>
        <label><span className="sr-only">Lọc trạng thái</span><select name="status" defaultValue={filters.status} className="h-11 w-full border border-[#38BDF8]/20 bg-[#080B18] px-3 text-[#F8FAFC] focus-ring"><option value="all">Mọi trạng thái</option><option value="pinned">Bài đang ghim</option><option value="draft">Wiki bản nháp</option><option value="unattached">Media chưa gắn bài</option></select></label>
        <button className="server-button px-5">Áp dụng bộ lọc</button>
      </form>
    </div>

    <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border border-[#8B5CF6]/20 bg-[#11162A] px-4 py-3">
      <div className="flex items-center gap-3"><input id="select-all-content" type="checkbox" checked={allChecked} onChange={toggleAll} className="size-4 accent-[#8B5CF6]" /><label htmlFor="select-all-content" className="text-sm font-bold text-[#E0F2FE]">Chọn tất cả</label><span className="text-xs text-[#94A3B8]">{checked.length} mục đã chọn</span></div>
      <button type="button" disabled={!checked.length || busy} onClick={bulk} className="server-button px-4 py-2 focus-ring">Thao tác hàng loạt: {trash ? "Khôi phục" : "Đưa vào thùng rác"}</button>
    </div>
    <p role="status" aria-live="polite" className="min-h-5 text-sm text-[#E0F2FE]">{message}</p>

    <div className="overflow-x-auto border border-[#38BDF8]/15">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="bg-[#11162A] text-xs uppercase text-[#94A3B8]"><tr><th className="p-4"><span className="sr-only">Chọn</span></th><th className="p-4">Nội dung</th><th className="p-4">Loại</th><th className="p-4">Trạng thái</th><th className="p-4">Vị trí</th><th className="p-4">Tác giả</th><th className="p-4 text-right">Thao tác</th></tr></thead>
        <tbody className="divide-y divide-[#38BDF8]/10 bg-[#0A0F20]">{items.map((item) => <tr key={key(item)} className="hover:bg-[#38BDF8]/5"><td className="p-4"><input type="checkbox" aria-label={`Chọn ${item.title}`} checked={checked.includes(key(item))} onChange={() => toggle(item)} className="size-4 accent-[#8B5CF6]" /></td><td className="max-w-80 p-4"><strong className="block truncate text-[#F8FAFC]">{item.title}</strong><span className="mt-1 block text-xs tabular-nums text-[#94A3B8]">{new Date(item.updatedAt).toLocaleString("vi-VN")}{item.sizeBytes !== null ? ` · ${formatBytes(item.sizeBytes)}` : ""}</span></td><td className="p-4 uppercase text-[#67E8F9]">{item.kind}</td><td className="p-4 text-[#94A3B8]">{trash ? `Xóa sau ${item.purgeAfter ? new Date(item.purgeAfter).toLocaleDateString("vi-VN") : "30 ngày"}` : item.status}</td><td className="p-4 text-[#94A3B8]">{item.categoryName ?? item.clusterName ?? item.attachedPage ?? (item.kind === "media" ? "Chưa gắn bài" : "-")}</td><td className="p-4 text-[#94A3B8]">{item.author ?? "Hệ thống"}</td><td className="p-4"><div className="flex justify-end gap-2">
          {!trash && item.kind === "forum" ? <><button type="button" onClick={() => operation(item, { action: "pin", pinned: !item.pinned })} className="control-topbar-link focus-ring">{item.pinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}{item.pinned ? "Bỏ ghim" : "Ghim bài"}</button><label><span className="sr-only">Chuyển danh mục {item.title}</span><select aria-label={`Chuyển danh mục ${item.title}`} value={item.categoryId ?? ""} onChange={(event) => operation(item, { action: "move", categoryId: Number(event.target.value) })} className="h-10 border border-[#38BDF8]/20 bg-[#080B18] px-2 text-xs text-[#E0F2FE] focus-ring">{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label></> : null}
          {!trash && item.kind === "wiki" ? <><button type="button" onClick={() => operation(item, { action: "publish", published: item.status !== "Xuất bản" })} className="control-topbar-link focus-ring"><FileEdit className="size-4" aria-hidden="true" />{item.status === "Xuất bản" ? "Chuyển thành bản nháp" : "Xuất bản"}</button><select aria-label={`Chuyển cụm ${item.title}`} value={item.clusterId ?? ""} onChange={(event) => operation(item, { action: "move-cluster", clusterId: Number(event.target.value) })} className="h-10 border border-[#38BDF8]/20 bg-[#080B18] px-2 text-xs text-[#E0F2FE] focus-ring">{clusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.name}</option>)}</select><Link href={`/control/wiki/${item.id}`} className="control-topbar-link focus-ring">Sửa</Link></> : null}
          {!trash && item.kind === "media" ? <button type="button" onClick={() => setPreview(item)} className="control-topbar-link focus-ring"><Eye className="size-4" aria-hidden="true" />Xem trước media</button> : null}
          {trash ? <><button type="button" onClick={() => mutate(item, "restore")} className="control-topbar-link focus-ring"><RotateCcw className="size-4" aria-hidden="true" />Khôi phục</button>{canManageUsers(actorRole) ? <button type="button" onClick={() => setSelected(item)} className="control-topbar-link is-danger focus-ring">Xóa vĩnh viễn</button> : null}</> : <button type="button" onClick={() => setSelected(item)} className="control-topbar-link is-danger focus-ring"><Trash2 className="size-4" aria-hidden="true" />Thùng rác</button>}
        </div></td></tr>)}</tbody>
      </table>{!items.length ? <div className="p-10 text-center"><Search className="mx-auto size-7 text-[#67E8F9]" aria-hidden="true" /><p className="mt-3 text-[#F8FAFC]">Không tìm thấy nội dung</p><p className="mt-1 text-sm text-[#94A3B8]">Thử đổi từ khóa hoặc quay về danh sách đang hoạt động.</p></div> : null}
    </div>

    {selected ? <div className="fixed inset-0 z-[80] grid place-items-center bg-[#030510]/80 p-4" role="dialog" aria-modal="true" aria-labelledby="content-dialog-title"><div className="w-full max-w-md border border-rose-400/30 bg-[#0D1225] p-6"><button type="button" onClick={() => setSelected(null)} className="float-right p-2 focus-ring" aria-label="Đóng"><X className="size-5" aria-hidden="true" /></button><h2 id="content-dialog-title" className="font-pixel text-base text-[#F8FAFC]">{trash ? "Xóa vĩnh viễn" : "Đưa vào thùng rác"}</h2><p className="mt-3 text-sm leading-6 text-[#94A3B8]">{trash ? "Hành động này không thể hoàn tác. Nhập XOA VINH VIEN để xác nhận." : "Nội dung được giữ 30 ngày và có thể khôi phục."}</p>{trash ? <label className="mt-4 grid gap-2 text-sm text-[#E0F2FE]">Cụm từ xác nhận<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 w-full border border-rose-400/25 bg-[#080B18] px-3 text-[#F8FAFC] focus-ring" /></label> : null}<button disabled={busy || (trash && confirmation !== "XOA VINH VIEN")} className="server-button mt-5 w-full py-3" onClick={() => mutate(selected, trash ? "delete-permanently" : "trash")}>{busy ? "Đang xử lý..." : trash ? "Xóa vĩnh viễn" : "Xác nhận"}</button></div></div> : null}
    {preview ? <div className="fixed inset-0 z-[80] grid place-items-center bg-[#030510]/85 p-4" role="dialog" aria-modal="true" aria-labelledby="media-preview-title"><div className="w-full max-w-3xl border border-[#67E8F9]/30 bg-[#0D1225] p-5"><div className="flex items-start justify-between"><div><p className="text-xs uppercase text-[#67E8F9]">MEDIA PREVIEW</p><h2 id="media-preview-title" className="mt-2 font-bold text-[#F8FAFC]">{preview.title}</h2></div><button type="button" onClick={() => setPreview(null)} className="p-2 focus-ring" aria-label="Đóng xem trước"><X className="size-5" aria-hidden="true" /></button></div><div className="relative mt-5 grid min-h-64 place-items-center bg-[#080B18] p-3">{preview.mediaType === "video" ? <video src={preview.mediaPath ?? ""} controls className="max-h-[65dvh] max-w-full" /> : <Image src={preview.mediaPath ?? ""} alt={`Xem trước ${preview.title}`} fill sizes="(max-width: 768px) 100vw, 768px" unoptimized={preview.mediaType === "gif"} className="object-contain p-3" />}</div><p className="mt-3 text-sm text-[#94A3B8]">{preview.attachedPage ? `Đang dùng trong: ${preview.attachedPage}` : "Media chưa được gắn vào bài Wiki."}</p></div></div> : null}
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="bg-[#0D1225] p-4"><span className="text-xs uppercase text-[#94A3B8]">{label}</span><strong className="mt-2 block text-xl tabular-nums text-[#F8FAFC]">{value}</strong></div>; }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 / 1024).toFixed(1)} MB`; }
