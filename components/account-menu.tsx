"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Gauge, LogOut, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { PublicUser } from "@/lib/auth/service";
import { logoutCurrentSession } from "@/lib/auth/client";
import { canAccessAdmin, normalizeAdminRole } from "@/lib/admin/authorization";

type AccountMenuProps = {
  user: PublicUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compact?: boolean;
};

function AccountAvatar({ user, className = "" }: { user: PublicUser; className?: string }) {
  const initial = user.displayName.trim().charAt(0).toLocaleUpperCase("vi") || "?";

  return (
    <span className={`account-avatar ${className}`} aria-hidden="true">
      {initial}
      {user.avatarUrl ? (
        // Avatar URLs can be local paths or user-managed remote URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ) : null}
    </span>
  );
}

export function AccountMenu({ user, open, onOpenChange, compact = false }: AccountMenuProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const profileLinkRef = useRef<HTMLAnchorElement>(null);
  const menuId = useId();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const role = normalizeAdminRole(user.roleName);
  const roleLabel = { owner: "Owner", admin: "Admin", staff: "Staff", player: "Player" }[role];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) profileLinkRef.current?.focus();
  }, [open]);

  async function handleLogout() {
    setError("");
    setLoggingOut(true);

    try {
      await logoutCurrentSession({ refresh: () => router.refresh() });
      onOpenChange(false);
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Không thể đăng xuất. Vui lòng thử lại."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div ref={rootRef} className={`account-menu-root ${compact ? "is-compact" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger focus-ring"
        aria-label={`Tài khoản ${user.displayName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => onOpenChange(!open)}
      >
        <AccountAvatar user={user} />
        <span className="account-trigger-copy">
          <span className="account-display-name">{user.displayName}</span>
          <span className="account-username">@{user.username}</span>
        </span>
        <span className="account-trigger-status" aria-hidden="true" />
        <ChevronDown className={`account-chevron ${open ? "is-open" : ""}`} aria-hidden="true" />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            className="account-dropdown"
            initial={{ opacity: 0, y: reducedMotion ? 0 : -8, scale: reducedMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -5, scale: reducedMotion ? 1 : 0.99 }}
            transition={{ duration: reducedMotion ? 0.08 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="account-dropdown-kicker">PLAYER IDENTITY</p>
            <div className="account-summary">
              <AccountAvatar user={user} className="account-avatar-large" />
              <span className="min-w-0">
                <strong>{user.displayName}</strong>
                <span>@{user.username}</span>
                <span className={`account-role-badge is-${role}`}>{roleLabel}</span>
              </span>
              <ShieldCheck className="account-role-icon" aria-hidden="true" />
            </div>
            <div className="account-menu-divider" />
            <Link ref={profileLinkRef} href="/profile/@me" role="menuitem" className="account-menu-link is-profile focus-ring" onClick={() => onOpenChange(false)}>
              <span className="account-menu-icon"><UserRound aria-hidden="true" /></span>
              <span><strong>Hồ sơ của tôi</strong><small>Xem hoạt động và chỉnh sửa</small></span>
              <ArrowUpRight className="account-menu-arrow" aria-hidden="true" />
            </Link>
            <Link href="/store#orders" role="menuitem" className="account-menu-link is-orders focus-ring" onClick={() => onOpenChange(false)}>
              <span className="account-menu-icon"><ShoppingBag aria-hidden="true" /></span>
              <span><strong>Đơn hàng của tôi</strong><small>Theo dõi gói nạp và giao lệnh</small></span>
              <ArrowUpRight className="account-menu-arrow" aria-hidden="true" />
            </Link>
            {canAccessAdmin(user.roleName) ? (
              <Link href="/control" target="_blank" rel="noreferrer" role="menuitem" className="account-menu-link is-control focus-ring" onClick={() => onOpenChange(false)}>
                <span className="account-menu-icon"><Gauge aria-hidden="true" /></span>
                <span><strong>Control Center</strong><small>Mở khu vực vận hành</small></span>
                <ArrowUpRight className="account-menu-arrow" aria-hidden="true" />
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="account-logout focus-ring"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
            {error ? <p className="account-error" role="alert">{error}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
