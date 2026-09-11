"use client";

import { FolderPlus, Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ForumCategory } from "@/lib/admin/forum-categories";
import { controlFetch } from "@/lib/control/client";

export function ForumCategoryManager({ categories }: { categories: ForumCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ForumCategory | "new" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const body = { title: form.get("title"), slug: form.get("slug"), description: form.get("description"), sortOrder: Number(form.get("sortOrder")) };
    const id = editing !== "new" && editing ? editing.id : null;
    try {
      const response = await controlFetch(id ? `/api/control/forum/categories/${id}` : "/api/control/forum/categories", { method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setEditing(null); setMessage(id ? "Đã cập nhật danh mục." : "Đã tạo danh mục."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu danh mục."); }
    finally { setBusy(false); }
  }

  async function remove(category: ForumCategory) {
    if (!window.confirm(`Xóa danh mục “${category.title}”? Danh mục chỉ xóa được khi không còn bài.`)) return;
    setBusy(true); setMessage("");
    try { const response = await controlFetch(`/api/control/forum/categories/${category.id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage("Đã xóa danh mục."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xóa danh mục."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-4 border border-[#38BDF8]/15 bg-[#0D1225] p-5"><div><h2 className="text-lg font-bold text-[#F8FAFC]">Cấu trúc diễn đàn</h2><p className="mt-1 text-sm text-[#94A3B8]">Sắp xếp khu vực thảo luận và theo dõi số bài trong từng danh mục.</p></div><button type="button" onClick={() => setEditing("new")} className="server-button px-5 py-3 focus-ring"><FolderPlus className="size-4" aria-hidden="true" />Tạo danh mục</button></div><p className="min-h-5 text-sm text-[#E0F2FE]" role="status">{message}</p>{editing ? <CategoryForm category={editing === "new" ? undefined : editing} busy={busy} onSubmit={save} onCancel={() => setEditing(null)} /> : null}<div className="grid gap-3">{categories.map((category) => <article key={category.id} className="grid gap-4 border border-[#38BDF8]/15 bg-[#0A0F20] p-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-bold text-[#F8FAFC]">{category.title}</h2><span className="border border-[#38BDF8]/20 px-2 py-1 text-xs text-[#67E8F9]">/{category.slug}</span></div><p className="mt-2 text-sm text-[#94A3B8]">{category.description}</p><p className="mt-3 text-xs text-[#94A3B8]"><strong className="tabular-nums text-[#E0F2FE]">{category.topics}</strong> bài viết · thứ tự <strong className="tabular-nums text-[#E0F2FE]">{category.sortOrder}</strong></p></div><div className="flex gap-2"><button type="button" onClick={() => setEditing(category)} className="control-topbar-link focus-ring"><Pencil className="size-4" aria-hidden="true" />Sửa</button><button type="button" disabled={busy || category.topics > 0} onClick={() => remove(category)} className="control-topbar-link is-danger focus-ring" title={category.topics > 0 ? "Chuyển hoặc xóa bài trước" : undefined}><Trash2 className="size-4" aria-hidden="true" />Xóa</button></div></article>)}{!categories.length ? <div className="border border-dashed border-[#38BDF8]/20 p-10 text-center text-sm text-[#94A3B8]">Chưa có danh mục. Tạo danh mục đầu tiên để tổ chức diễn đàn.</div> : null}</div></div>;
}

function CategoryForm({ category, busy, onSubmit, onCancel }: { category?: ForumCategory; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form onSubmit={onSubmit} className="grid gap-4 border border-[#67E8F9]/25 bg-[#0D1225] p-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#E0F2FE]">Tên danh mục<input name="title" defaultValue={category?.title} required minLength={3} maxLength={120} className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 font-normal text-[#F8FAFC] focus-ring" /></label><label className="grid gap-2 text-sm font-bold text-[#E0F2FE]">Slug<input name="slug" defaultValue={category?.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 font-normal text-[#F8FAFC] focus-ring" /></label><label className="grid gap-2 text-sm font-bold text-[#E0F2FE] sm:col-span-2">Mô tả<textarea name="description" defaultValue={category?.description} required minLength={3} maxLength={1000} rows={3} className="border border-[#38BDF8]/20 bg-[#080B18] p-3 font-normal text-[#F8FAFC] focus-ring" /></label><label className="grid gap-2 text-sm font-bold text-[#E0F2FE]">Thứ tự<input name="sortOrder" type="number" min={-9999} max={9999} defaultValue={category?.sortOrder ?? 0} className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 font-normal text-[#F8FAFC] focus-ring" /></label><div className="flex items-end justify-end gap-3"><button type="button" onClick={onCancel} className="server-button server-button-dark px-4 py-3"><X className="size-4" aria-hidden="true" />Hủy</button><button disabled={busy} className="server-button px-4 py-3"><Save className="size-4" aria-hidden="true" />{busy ? "Đang lưu..." : "Lưu danh mục"}</button></div></form>;
}
