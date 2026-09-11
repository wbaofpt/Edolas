"use client";

import {
  Activity,
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileStack,
  FolderTree,
  Globe2,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
  RadioTower,
  Server,
  ShoppingBag,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicUser } from "@/lib/auth/service";
import { canManageSettings, canManageUsers, normalizeAdminRole } from "@/lib/admin/authorization";
import { controlFetch } from "@/lib/control/client";

const navigation = [
  { href: "/control/minecraft", label: "Minecraft", icon: Server, userAdmin: true },
  { href: "/control/store", label: "Cửa hàng", icon: ShoppingBag, userAdmin: true },
  { href: "/control", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/control/users", label: "Thành viên", icon: UsersRound, userAdmin: true },
  { href: "/control/content", label: "Nội dung", icon: FileStack },
  { href: "/control/categories", label: "Danh mục", icon: FolderTree, userAdmin: true },
  { href: "/control/sessions", label: "Phiên đăng nhập", icon: RadioTower, userAdmin: true },
  { href: "/control/website", label: "Website", icon: Globe2, settingsAdmin: true },
  { href: "/control/wiki", label: "Kho Wiki", icon: BookOpen },
  { href: "/control/audit", label: "Nhật ký", icon: Activity },
  { href: "/control/settings", label: "Cài đặt", icon: Settings2, settingsAdmin: true }
];

const roleLabels = { owner: "Owner", admin: "Admin", staff: "Staff", player: "Player" };

export function AdminShell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const items = navigation.filter((item) => (!item.userAdmin || canManageUsers(user.roleName)) && (!item.settingsAdmin || canManageSettings(user.roleName)));
  const role = normalizeAdminRole(user.roleName);

  async function closeControlSession() {
    setClosing(true);
    await controlFetch("/api/control/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/control/access");
    router.refresh();
  }

  return (
    <div className="control-shell">
      <header className="control-topbar">
        <div className="control-brand">
          <span><ShieldCheck aria-hidden="true" /></span>
          <p><small>EDOLAS NETWORK</small><strong>CONTROL NODE</strong></p>
        </div>
        <div className="control-topbar-actions">
          <span className="control-session-signal"><i />Phiên bảo mật · 30 phút</span>
          <Link href="/" target="_blank" rel="noreferrer" className="control-topbar-link focus-ring"><ExternalLink aria-hidden="true" />Mở website</Link>
          <button type="button" disabled={closing} onClick={closeControlSession} className="control-topbar-link is-danger focus-ring"><LogOut aria-hidden="true" />{closing ? "Đang khóa..." : "Khóa Control"}</button>
        </div>
      </header>

      <div className="admin-shell mx-auto grid min-h-[calc(100dvh-65px)] w-full max-w-[1680px] gap-0 px-3 pb-8 pt-4 sm:px-5 lg:grid-cols-[264px_minmax(0,1fr)] lg:px-8">
        <aside className="admin-sidebar relative lg:sticky lg:top-[81px] lg:h-[calc(100dvh-97px)]" aria-label="Điều hướng quản trị">
          <div className="admin-sidebar-heading">
            <span>OPERATIONS</span>
            <strong>Trung tâm điều hành</strong>
          </div>
          <nav className="admin-nav" aria-label="Điều hướng quản trị">
            {items.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`focus-ring ${active ? "is-active" : ""}`}>
                  <Icon aria-hidden="true" /><span>{label}</span>{active ? <ChevronRight className="admin-nav-arrow" aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="control-operator-card">
            <span className="control-operator-avatar" aria-hidden="true">{user.displayName.charAt(0).toUpperCase()}</span>
            <p><small>Đang vận hành</small><strong>{user.displayName}</strong><span>@{user.username}</span></p>
            <b>{roleLabels[role]}</b>
          </div>
        </aside>
        <section className="control-workspace">{children}</section>
      </div>
    </div>
  );
}
