"use client";

import { FilePlus2, ImagePlus, LoaderCircle, Pencil, Plus, RotateCcw, Save, Tags, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { controlFetch } from "@/lib/control/client";
import type { WebsiteResource, WebsiteResourceKind } from "@/lib/control/website-resources";

type Field = { key: string; label: string; type?: "date" | "select" | "textarea"; options?: string[] };
const configs: Record<WebsiteResourceKind, { label: string; singular: string; fields: Field[]; defaults: Record<string, string> }> = {
  announcement: { label: "Thông báo", singular: "thông báo", fields: [{ key: "title", label: "Tiêu đề" }, { key: "body", label: "Nội dung", type: "textarea" }, { key: "publishedAt", label: "Ngày đăng", type: "date" }], defaults: { title: "", body: "", publishedAt: new Date().toISOString().slice(0, 10) } },
  "game-mode": { label: "Chế độ chơi", singular: "chế độ", fields: [{ key: "slug", label: "Slug" }, { key: "name", label: "Tên chế độ" }, { key: "summary", label: "Mô tả", type: "textarea" }, { key: "status", label: "Trạng thái" }], defaults: { slug: "", name: "", summary: "", status: "Đang mở" } },
  rule: { label: "Nội quy", singular: "nội quy", fields: [{ key: "code", label: "Mã luật" }, { key: "title", label: "Tiêu đề" }, { key: "summary", label: "Mô tả", type: "textarea" }, { key: "severity", label: "Mức độ", type: "select", options: ["Tối cao", "Nặng", "Nhắc nhở"] }], defaults: { code: "", title: "", summary: "", severity: "Nhắc nhở" } },
  stat: { label: "Thống kê", singular: "chỉ số", fields: [{ key: "statKey", label: "Khóa chỉ số" }, { key: "statValue", label: "Giá trị" }, { key: "statDetail", label: "Mô tả" }], defaults: { statKey: "", statValue: "", statDetail: "" } }
};

export function WebsiteResourceManager({ resources }: { resources: WebsiteResource[] }) {
  const router = useRouter();
  const [active, setActive] = useState<WebsiteResourceKind>("announcement");
  const [editing, setEditing] = useState<WebsiteResource | "new" | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [modeTags, setModeTags] = useState<string[]>([]);
  const [bannerPath, setBannerPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [message, setMessage] = useState("");
  const config = configs[active];
  const visible = resources.filter((resource) => resource.kind === active);

  function openEditor(resource: WebsiteResource | "new") {
    setEditing(resource);
    setValues(resource === "new" ? config.defaults : resource.values);
    setModeTags(resource === "new" ? ["PE/PC"] : resource.tags ?? ["PE/PC", resource.values.name]);
    setBannerPath(resource === "new" ? null : resource.bannerPath ?? null);
    setMessage("");
  }

  async function request(url: string, body: object, method = "PATCH") {
    setBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEditing(null);
      setMessage("Dữ liệu website đã được cập nhật.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật dữ liệu website.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const payload = active === "game-mode" ? { ...values, tags: modeTags } : values;
    if (editing === "new") await request(`/api/control/website/${active}`, payload, "POST");
    else if (editing) await request(`/api/control/website/${active}/${editing.id}`, { action: "save", values: payload });
  }

  async function uploadBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || editing === "new" || !editing) return;
    setBannerBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await controlFetch(`/api/control/website/game-mode/${editing.id}/banner`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setBannerPath(data.bannerPath);
      setMessage("Ảnh banner đã được cập nhật.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải ảnh banner.");
    } finally {
      setBannerBusy(false);
    }
  }

  async function removeBanner() {
    if (editing === "new" || !editing) return;
    setBannerBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(`/api/control/website/game-mode/${editing.id}/banner`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setBannerPath(null);
      setMessage("Ảnh banner đã được gỡ.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể gỡ ảnh banner.");
    } finally {
      setBannerBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <nav className="grid gap-2 sm:grid-cols-4" aria-label="Nhóm dữ liệu website">
        {(Object.keys(configs) as WebsiteResourceKind[]).map((kind) => (
          <button key={kind} type="button" onClick={() => { setActive(kind); setEditing(null); }} aria-pressed={active === kind} className={`focus-ring min-h-12 border px-4 text-sm font-bold ${active === kind ? "border-[#67E8F9]/45 bg-[#38BDF8]/10 text-[#F8FAFC]" : "border-[#38BDF8]/15 bg-[#0D1225] text-[#94A3B8]"}`}>
            {configs[kind].label}<small className="ml-2 text-[#67E8F9]">{resources.filter((resource) => resource.kind === kind).length}</small>
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-pixel text-lg text-[#F8FAFC]">{config.label}</h2><p className="mt-2 text-sm text-[#94A3B8]">Thay đổi tại đây được đồng bộ với giao diện công khai.</p></div>
        <button type="button" onClick={() => openEditor("new")} className="server-button px-5 py-3 focus-ring"><FilePlus2 className="size-4" />Tạo {config.singular}</button>
      </div>

      {message ? <p role="status" className="border border-[#67E8F9]/20 bg-[#38BDF8]/10 p-3 text-sm text-[#E0F2FE]">{message}</p> : null}
      <div className="grid gap-3">
        {visible.map((resource) => (
          <article key={`${resource.kind}-${resource.id}`} className={`grid gap-4 border p-4 md:grid-cols-[auto_1fr_auto] md:items-center ${resource.deletedAt ? "border-rose-400/20 bg-rose-400/5" : "border-[#38BDF8]/15 bg-[#0D1225]"}`}>
            {resource.kind === "game-mode" ? (
              <div className="relative h-16 w-28 shrink-0 overflow-hidden border border-[#38BDF8]/20 bg-[#080B18]">
                {resource.bannerPath ? <Image src={resource.bannerPath} alt="" fill sizes="112px" className="object-cover" aria-hidden="true" /> : <ImagePlus className="absolute inset-0 m-auto size-5 text-[#38BDF8]/45" aria-hidden="true" />}
              </div>
            ) : null}
            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[#67E8F9]">{resource.kind} #{resource.id}</span><h3 className="mt-2 font-bold text-[#F8FAFC]">{resource.values.title ?? resource.values.name ?? resource.values.code ?? resource.values.statKey}</h3><p className="mt-1 line-clamp-2 text-sm text-[#94A3B8]">{resource.values.body ?? resource.values.summary ?? resource.values.statDetail}</p></div>
            <div className="flex gap-2"><button type="button" onClick={() => openEditor(resource)} className="control-topbar-link focus-ring"><Pencil className="size-4" />Sửa</button><button type="button" onClick={() => request(`/api/control/website/${active}/${resource.id}`, { action: resource.deletedAt ? "restore" : "trash" })} className={`control-topbar-link focus-ring ${resource.deletedAt ? "" : "is-danger"}`}>{resource.deletedAt ? <RotateCcw className="size-4" /> : <Trash2 className="size-4" />}{resource.deletedAt ? "Khôi phục" : "Thùng rác"}</button></div>
          </article>
        ))}
        {!visible.length ? <div className="border border-dashed border-[#38BDF8]/20 p-12 text-center text-sm text-[#94A3B8]">Chưa có dữ liệu trong nhóm này.</div> : null}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[#030510]/85 p-4" role="dialog" aria-modal="true" aria-labelledby="resource-editor-title">
          <form onSubmit={save} className="my-8 w-full max-w-2xl border border-[#67E8F9]/30 bg-[#0D1225] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between"><div><span className="control-kicker">DATABASE EDITOR</span><h2 id="resource-editor-title" className="mt-3 font-pixel text-lg">{editing === "new" ? "Tạo" : "Chỉnh sửa"} {config.singular}</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Đóng" className="focus-ring p-2"><X className="size-5" /></button></div>

            {active === "game-mode" ? (
              <section className="mt-6 border border-[#38BDF8]/15 bg-[#080B18] p-4" aria-labelledby="game-mode-banner-label">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="game-mode-banner-label" className="text-sm font-bold text-[#E0F2FE]">Ảnh banner</h3><p className="mt-1 text-xs leading-5 text-[#94A3B8]">JPG, PNG hoặc WebP, tối đa 8 MB. Nên dùng tỷ lệ 16:7.</p></div><span className="border border-[#67E8F9]/20 px-2 py-1 text-[10px] font-bold tracking-widest text-[#67E8F9]">CARD BACKDROP</span></div>
                {editing === "new" ? (
                  <div className="mt-4 border border-dashed border-[#38BDF8]/20 px-4 py-8 text-center text-sm text-[#94A3B8]">Lưu chế độ chơi trước để tải ảnh banner.</div>
                ) : (
                  <>
                    <div className="relative mt-4 aspect-[16/7] overflow-hidden border border-[#38BDF8]/25 bg-[radial-gradient(circle_at_70%_20%,rgba(139,92,246,0.22),transparent_40%),#080B18]">
                      {bannerPath ? <Image src={bannerPath} alt={`Banner hiện tại của ${values.name || "chế độ chơi"}`} fill sizes="640px" className="object-cover" /> : <div className="absolute inset-0 grid place-items-center"><div className="text-center"><ImagePlus className="mx-auto size-8 text-[#38BDF8]/55" /><p className="mt-3 text-xs text-[#94A3B8]">Chưa có ảnh banner</p></div></div>}
                      {bannerBusy ? <div className="absolute inset-0 grid place-items-center bg-[#080B18]/80" role="status"><span className="flex items-center gap-2 text-sm font-bold text-[#E0F2FE]"><LoaderCircle className="size-5 animate-spin text-[#67E8F9]" />Đang xử lý ảnh...</span></div> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className={`control-topbar-link focus-ring cursor-pointer ${bannerBusy ? "pointer-events-none opacity-50" : ""}`}><ImagePlus className="size-4" />{bannerPath ? "Thay ảnh" : "Chọn ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBanner} disabled={bannerBusy} className="sr-only" /></label>
                      {bannerPath ? <button type="button" onClick={removeBanner} disabled={bannerBusy} className="control-topbar-link is-danger focus-ring"><Trash2 className="size-4" />Gỡ banner</button> : null}
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {active === "game-mode" ? (
              <section className="mt-4 border border-[#38BDF8]/15 bg-[#080B18] p-4" aria-labelledby="game-mode-tags-label">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 id="game-mode-tags-label" className="flex items-center gap-2 text-sm font-bold text-[#E0F2FE]"><Tags className="size-4 text-[#67E8F9]" aria-hidden="true" />Tag hiển thị</h3><p className="mt-1 text-xs leading-5 text-[#94A3B8]">Tối đa 8 tag, mỗi tag 24 ký tự. Tag sẽ thay cho chữ trạng thái trên banner.</p></div>
                  <span className="border border-[#67E8F9]/20 px-2 py-1 text-[10px] font-bold tracking-widest text-[#67E8F9]">{modeTags.length}/8 TAGS</span>
                </div>
                <div className="mt-4 grid gap-2">
                  {modeTags.map((tag, index) => (
                    <div key={index} className="grid grid-cols-[1fr_44px] gap-2">
                      <label className="sr-only" htmlFor={`mode-tag-${index}`}>Tag {index + 1}</label>
                      <input id={`mode-tag-${index}`} value={tag} maxLength={24} onChange={(event) => setModeTags(modeTags.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Ví dụ: PE/PC" className="h-11 border border-[#38BDF8]/20 bg-[#0D1225] px-3 text-sm text-[#F8FAFC] focus:border-[#67E8F9] focus:outline-none" />
                      <button type="button" onClick={() => setModeTags(modeTags.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Xóa tag ${index + 1}`} className="focus-ring grid min-h-11 place-items-center border border-rose-400/20 text-rose-300 transition-colors hover:border-rose-300/50 hover:bg-rose-400/10"><X className="size-4" aria-hidden="true" /></button>
                    </div>
                  ))}
                  {!modeTags.length ? <p role="alert" className="border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-200">Cần ít nhất một tag trước khi lưu.</p> : null}
                </div>
                <button type="button" onClick={() => setModeTags([...modeTags, ""])} disabled={modeTags.length >= 8} className="control-topbar-link focus-ring mt-3 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-4" aria-hidden="true" />Thêm tag</button>
              </section>
            ) : null}

            <div className="mt-6 grid gap-4">
              {config.fields.map((field) => (
                <label key={field.key} className="grid gap-2 text-sm font-bold text-[#E0F2FE]">{field.label}{field.type === "textarea" ? <textarea value={values[field.key] ?? ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} rows={5} required className="border border-[#38BDF8]/20 bg-[#080B18] p-3 font-normal text-[#F8FAFC]" /> : field.type === "select" ? <select value={values[field.key] ?? ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 font-normal text-[#F8FAFC]">{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : <input type={field.type ?? "text"} value={values[field.key] ?? ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} required className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 font-normal text-[#F8FAFC]" />}</label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="server-button server-button-dark px-4 py-2">Hủy</button><button disabled={busy || bannerBusy || (active === "game-mode" && !modeTags.some((tag) => tag.trim()))} className="server-button px-5 py-2"><Save className="size-4" />{busy ? "Đang lưu..." : "Lưu dữ liệu"}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
