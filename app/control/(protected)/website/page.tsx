import { WebsiteResourceManager } from "@/components/control/website-resource-manager";
import { requireControlSettingsAdmin } from "@/lib/control/server-session";
import { listWebsiteResources } from "@/lib/control/website-resources";

export default async function WebsiteControlPage() {
  await requireControlSettingsAdmin();
  const resources = await listWebsiteResources().catch(() => []);
  return <div><header className="mb-7"><p className="font-pixel text-[10px] uppercase tracking-widest text-[#67E8F9]">PUBLIC DATA MATRIX</p><h1 className="mt-3 font-pixel text-2xl text-[#F8FAFC]">Dữ liệu website</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#94A3B8]">Quản lý nội dung cấu trúc xuất hiện trên trang chủ, trang chế độ chơi và khu nội quy. Mọi thay đổi đều được ghi vào audit.</p></header><WebsiteResourceManager resources={resources} /></div>;
}
