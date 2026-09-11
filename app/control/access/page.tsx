import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LockKeyhole, Radar, ShieldCheck } from "lucide-react";
import { ControlAccessForm } from "@/components/control/control-access-form";
import { canAccessAdmin } from "@/lib/admin/authorization";
import { getUserBySession } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { CONTROL_SESSION_COOKIE } from "@/lib/control/session";
import { resolveControlSession } from "@/lib/control/session-service";

export default async function ControlAccessPage() {
  const jar = cookies();
  const existing = await resolveControlSession(jar.get(CONTROL_SESSION_COOKIE)?.value).catch(() => null);
  if (existing) redirect("/control");

  const user = await getUserBySession(jar.get(SESSION_COOKIE_NAME)?.value).catch(() => null);
  if (!user) redirect("/login?next=/control/access");
  if (!canAccessAdmin(user.roleName)) redirect("/");

  return (
    <div className="control-access-page">
      <div className="control-access-grid" aria-hidden="true" />
      <aside className="control-access-brief">
        <span className="control-kicker"><Radar aria-hidden="true" />EDOLAS / CONTROL NODE</span>
        <h2>Quyền vận hành<br /><em>không dùng chung</em><br />với phiên website.</h2>
        <p>Mỗi lần vào khu vực quản trị đều cần hai lớp xác thực. Phiên sẽ tự khóa sau 30 phút không hoạt động.</p>
        <ul>
          <li><ShieldCheck aria-hidden="true" /><span><strong>Phiên độc lập</strong>Token chỉ dùng cho Control Center.</span></li>
          <li><LockKeyhole aria-hidden="true" /><span><strong>Không lưu mã OTP</strong>Máy chủ chỉ giữ bản băm dùng một lần.</span></li>
        </ul>
      </aside>
      <ControlAccessForm />
    </div>
  );
}
