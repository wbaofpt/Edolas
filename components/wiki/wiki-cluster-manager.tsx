"use client";

import { Layers3, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { WikiCluster } from "@/lib/wiki/service";
import { controlFetch } from "@/lib/control/client";
import { WikiConfirmDialog } from "./wiki-confirm-dialog";

type EditingId = number | "new" | null;

export function WikiClusterManager({ clusters }: { clusters: WikiCluster[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<EditingId>(null);
  const [deleting, setDeleting] = useState<WikiCluster | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>, id?: number) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const payload = { name: data.get("name"), slug: data.get("slug"), description: data.get("description"), accent: data.get("accent"), sortOrder: Number(data.get("sortOrder")) };
    try {
      const response = await controlFetch(id ? `/api/control/wiki/clusters/${id}` : "/api/control/wiki/clusters", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Không thể lưu cụm Wiki.");
      setEditingId(null); setMessage(id ? "Đã cập nhật cụm Wiki." : "Đã tạo cụm Wiki."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu cụm Wiki."); }
    finally { setBusy(false); }
  }

  async function deleteCluster() {
    if (!deleting) return;
    setBusy(true); setMessage("");
    try {
      const response = await controlFetch(`/api/control/wiki/clusters/${deleting.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Không thể xóa cụm Wiki.");
      setDeleting(null); setMessage("Đã xóa cụm Wiki."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xóa cụm Wiki."); }
    finally { setBusy(false); }
  }

  return <div><div className="wiki-cluster-heading"><div><h2>Danh sách cụm</h2><p>Mỗi bài Wiki phải thuộc một cụm nội dung.</p></div><button type="button" onClick={() => setEditingId("new")} className="server-button px-5 py-3 focus-ring"><Plus className="h-4 w-4" />Tạo cụm mới</button></div><p className="mb-4 min-h-5 text-sm text-[#94A3B8]" aria-live="polite">{message}</p>{editingId === "new" ? <ClusterForm busy={busy} onSubmit={(event) => save(event)} onCancel={() => setEditingId(null)} /> : null}<div className="grid gap-3">{clusters.map((cluster) => <div key={cluster.id} className="wiki-cluster-admin-item"><div className={`wiki-cluster-symbol wiki-accent-${cluster.accent}`}><Layers3 className="h-5 w-5" /></div><div className="wiki-cluster-admin-copy"><div><h3>{cluster.name}</h3><span>/{cluster.slug}</span></div><p>{cluster.description}</p><dl><div><dt>Số bài</dt><dd>{cluster.pages}</dd></div><div><dt>Màu</dt><dd>{cluster.accent}</dd></div><div><dt>Thứ tự</dt><dd>{cluster.sortOrder}</dd></div></dl></div><div className="wiki-cluster-admin-actions"><button type="button" onClick={() => setEditingId(cluster.id)} className="wiki-icon-button focus-ring" aria-label={`Sửa ${cluster.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => setDeleting(cluster)} className="wiki-icon-button is-danger focus-ring" aria-label={`Xóa ${cluster.name}`}><Trash2 className="h-4 w-4" /></button></div>{editingId === cluster.id ? <div className="wiki-cluster-inline-editor"><ClusterForm cluster={cluster} busy={busy} onSubmit={(event) => save(event, cluster.id)} onCancel={() => setEditingId(null)} /></div> : null}</div>)}</div><WikiConfirmDialog open={Boolean(deleting)} title="Xóa cụm Wiki?" description={deleting ? `Cụm “${deleting.name}” chỉ có thể xóa khi không còn bài viết bên trong.` : ""} busy={busy} onCancel={() => setDeleting(null)} onConfirm={deleteCluster} /></div>;
}

function ClusterForm({ cluster, busy, onSubmit, onCancel }: { cluster?: WikiCluster; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form onSubmit={onSubmit} className="wiki-cluster-form"><div className="wiki-form-field"><label htmlFor={`cluster-name-${cluster?.id ?? "new"}`}>Tên cụm</label><input id={`cluster-name-${cluster?.id ?? "new"}`} name="name" defaultValue={cluster?.name} required className="wiki-input focus-ring" /></div><div className="wiki-form-field"><label htmlFor={`cluster-slug-${cluster?.id ?? "new"}`}>Slug</label><input id={`cluster-slug-${cluster?.id ?? "new"}`} name="slug" defaultValue={cluster?.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required className="wiki-input focus-ring" /></div><div className="wiki-form-field is-wide"><label htmlFor={`cluster-description-${cluster?.id ?? "new"}`}>Mô tả</label><input id={`cluster-description-${cluster?.id ?? "new"}`} name="description" defaultValue={cluster?.description} maxLength={300} required className="wiki-input focus-ring" /></div><div className="wiki-form-field"><label htmlFor={`cluster-accent-${cluster?.id ?? "new"}`}>Màu nhấn</label><select id={`cluster-accent-${cluster?.id ?? "new"}`} name="accent" defaultValue={cluster?.accent ?? "cyan"} className="wiki-input focus-ring"><option value="cyan">Cyan</option><option value="violet">Tím điện</option><option value="sapphire">Sapphire</option><option value="ice">Trắng băng</option></select></div><div className="wiki-form-field"><label htmlFor={`cluster-order-${cluster?.id ?? "new"}`}>Thứ tự</label><input id={`cluster-order-${cluster?.id ?? "new"}`} name="sortOrder" type="number" defaultValue={cluster?.sortOrder ?? 0} className="wiki-input focus-ring" /></div><div className="wiki-cluster-form-actions"><button type="button" onClick={onCancel} disabled={busy} className="server-button server-button-dark px-4 py-3 focus-ring"><X className="h-4 w-4" />Hủy</button><button disabled={busy} className="server-button px-4 py-3 focus-ring"><Save className="h-4 w-4" />{busy ? "Đang lưu..." : "Lưu cụm"}</button></div></form>;
}
