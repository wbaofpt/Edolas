import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { listSiteSettings } from "@/lib/admin/service";
import { requireControlSettingsAdmin } from "@/lib/control/server-session";

export default async function SettingsPage() {
  await requireControlSettingsAdmin();
  const settings = await listSiteSettings().catch(() => []);
  return <div><header className="mb-7"><p className="font-pixel text-[10px] uppercase tracking-widest text-[#67E8F9]">SYSTEM CONFIGURATION</p><h1 className="mt-3 font-pixel text-2xl text-[#F8FAFC]">Cài đặt website</h1><p className="mt-3 text-sm text-[#94A3B8]">Quản lý cấu hình công khai; secret và biến môi trường không bao giờ xuất hiện tại đây.</p></header><AdminSettingsForm settings={settings} /></div>;
}
