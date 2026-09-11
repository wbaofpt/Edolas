import { AdminSessionTable } from "@/components/admin/admin-session-table";
import { listAdminSessions } from "@/lib/admin/sessions";
import { requireControlAccountAdmin } from "@/lib/control/server-session";

export default async function SessionsPage({ searchParams }: { searchParams: { query?: string; kind?: string } }) {
  await requireControlAccountAdmin();
  const filters = { query: searchParams.query ?? "", kind: searchParams.kind ?? "all" };
  const sessions = await listAdminSessions(filters).catch(() => []);
  return <div><header className="mb-7"><p className="font-pixel text-[10px] uppercase text-[#67E8F9]">SESSION MATRIX</p><h1 className="mt-3 text-balance font-pixel text-2xl text-[#F8FAFC]">Phiên đăng nhập</h1><p className="mt-3 text-pretty text-sm text-[#94A3B8]">Theo dõi phiên Website và Control đang hoạt động. Token bí mật không bao giờ hiển thị trong giao diện.</p></header><AdminSessionTable sessions={sessions} filters={filters} /></div>;
}
