import { AdminUserTable } from "@/components/admin/admin-user-table";
import { listAdminUsers } from "@/lib/admin/service";
import { requireControlAccountAdmin } from "@/lib/control/server-session";

export default async function UsersPage({ searchParams }: { searchParams: { query?: string; role?: string; status?: string } }) {
  const actor = await requireControlAccountAdmin();
  const users = await listAdminUsers(searchParams.query, searchParams.status, searchParams.role).catch(() => []);
  return <div><header className="mb-7"><p className="font-pixel text-[10px] uppercase tracking-widest text-[#67E8F9]">IDENTITY CONTROL</p><h1 className="mt-3 font-pixel text-2xl text-[#F8FAFC]">Quản lý thành viên</h1><p className="mt-3 text-sm text-[#94A3B8]">Kiểm soát vai trò, trạng thái tài khoản và các phiên đăng nhập đang hoạt động.</p></header><AdminUserTable users={users} actor={actor} /></div>;
}
