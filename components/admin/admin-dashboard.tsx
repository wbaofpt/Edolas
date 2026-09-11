import Link from "next/link";
import { Activity, Database, FileStack, FileWarning, HardDrive, Pin, Radio, ShieldAlert, Trash2, Unlink, UsersRound } from "lucide-react";
import type { AdminAuditEntry, AdminOverview } from "@/lib/admin/service";

const format = new Intl.NumberFormat("vi-VN");

export function AdminDashboard({ overview, audit }: { overview: AdminOverview; audit: AdminAuditEntry[] }) {
  const cards = [
    { label: "Tổng thành viên", value: overview.users, detail: `${overview.activeUsers} tài khoản hoạt động`, icon: UsersRound },
    { label: "Phiên hoạt động", value: overview.activeSessions, detail: "Phiên đăng nhập chưa hết hạn", icon: Radio },
    { label: "Nội dung công khai", value: overview.forumTopics + overview.wikiPages, detail: `${overview.forumTopics} diễn đàn · ${overview.wikiPages} Wiki`, icon: FileStack },
    { label: "Trong thùng rác", value: overview.trashItems, detail: "Tự động đến hạn sau 30 ngày", icon: Trash2 }
  ];
  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[#67E8F9]">Operations deck // live data</p><h1 className="mt-3 font-pixel text-2xl text-[#F8FAFC] sm:text-3xl">Toàn cảnh hệ thống</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#94A3B8]">Theo dõi sức khỏe cộng đồng và xử lý các khu vực cần chú ý từ một bảng điều khiển duy nhất.</p></div>
      <span className="inline-flex min-h-11 items-center gap-2 border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-300"><span className="size-2 bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /> Hệ thống sẵn sàng</span>
    </header>
    <section aria-label="Chỉ số vận hành" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon }) => <article key={label} className="group relative overflow-hidden border border-[#38BDF8]/15 bg-[#0D1225] p-5 transition hover:-translate-y-0.5 hover:border-[#67E8F9]/35"><span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B5CF6] to-[#38BDF8] opacity-60" /><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{label}</span><Icon className="size-4 text-[#67E8F9]" aria-hidden="true" /></div><strong className="mt-5 block font-pixel text-2xl text-[#F8FAFC]">{format.format(value)}</strong><span className="mt-3 block text-xs leading-5 text-[#94A3B8]">{detail}</span></article>)}</section>
    <section aria-label="Nội dung cần chú ý" className="grid gap-px border border-[#38BDF8]/15 bg-[#38BDF8]/10 sm:grid-cols-2 xl:grid-cols-4">
      <Attention href="/control/content?kind=forum&status=pinned" label="Bài đang ghim" value={overview.pinnedTopics} icon={Pin} />
      <Attention href="/control/content?kind=wiki&status=draft" label="Wiki bản nháp" value={overview.draftWikiPages} icon={FileWarning} />
      <Attention href="/control/content?kind=media&status=unattached" label="Media chưa gắn" value={overview.unattachedMedia} icon={Unlink} />
      <Attention href="/control/content?trash=1" label="Sắp đến hạn xóa" value={overview.expiringTrash} icon={Trash2} />
    </section>
    <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
      <article className="border border-[#38BDF8]/15 bg-[#0D1225]"><div className="flex items-center justify-between border-b border-[#38BDF8]/10 p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-[#67E8F9]">Tình trạng hệ thống</p><h2 className="mt-2 text-lg font-bold text-[#F8FAFC]">Dữ liệu và an toàn</h2></div><Database className="size-5 text-[#8B5CF6]" /></div><div className="grid gap-px bg-[#38BDF8]/10 sm:grid-cols-3"><div className="bg-[#0D1225] p-5"><HardDrive className="size-4 text-[#67E8F9]"/><strong className="mt-4 block text-xl text-[#F8FAFC]">{overview.mediaFiles}</strong><span className="mt-1 text-xs text-[#94A3B8]">Tệp media</span></div><div className="bg-[#0D1225] p-5"><ShieldAlert className="size-4 text-amber-300"/><strong className="mt-4 block text-xl text-[#F8FAFC]">{overview.lockedUsers}</strong><span className="mt-1 text-xs text-[#94A3B8]">Tài khoản khóa</span></div><div className="bg-[#0D1225] p-5"><Activity className="size-4 text-emerald-300"/><strong className="mt-4 block text-xl text-[#F8FAFC]">MySQL</strong><span className="mt-1 text-xs text-[#94A3B8]">Nguồn dữ liệu thật</span></div></div><div className="flex flex-wrap gap-3 p-5"><Link href="/control/users?status=locked" className="server-button server-button-dark px-4 py-2.5 text-sm focus-ring">Kiểm tra tài khoản</Link><Link href="/control/content?trash=1" className="server-button server-button-dark px-4 py-2.5 text-sm focus-ring">Mở thùng rác</Link></div></article>
      <article className="border border-[#38BDF8]/15 bg-[#0D1225]"><div className="border-b border-[#38BDF8]/10 p-5"><p className="text-xs font-bold uppercase tracking-widest text-[#67E8F9]">Hoạt động gần đây</p><h2 className="mt-2 text-lg font-bold text-[#F8FAFC]">Audit trail</h2></div><div className="divide-y divide-[#38BDF8]/10">{audit.length ? audit.slice(0, 6).map((entry) => <div key={entry.id} className="p-4"><strong className="block text-sm text-[#E0F2FE]">{entry.summary}</strong><span className="mt-1 block text-xs text-[#94A3B8]">{entry.actor ?? "Hệ thống"} · {new Date(entry.createdAt).toLocaleString("vi-VN")}</span></div>) : <p className="p-6 text-sm leading-6 text-[#94A3B8]">Chưa có thao tác quản trị nào được ghi nhận.</p>}</div></article>
    </section>
  </div>;
}

function Attention({ href, label, value, icon: Icon }: { href: string; label: string; value: number; icon: typeof Pin }) {
  return <Link href={href} className="group flex min-h-20 items-center justify-between bg-[#0D1225] px-5 focus-ring"><span><small className="block text-xs text-[#94A3B8]">{label}</small><strong className="mt-1 block text-xl tabular-nums text-[#F8FAFC]">{format.format(value)}</strong></span><Icon className="size-4 text-[#67E8F9] transition-transform group-hover:-translate-y-0.5" aria-hidden="true" /></Link>;
}
