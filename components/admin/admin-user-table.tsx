"use client";

import { Ban, LockKeyhole, Mail, RefreshCw, Search, Shield, TimerReset, UnlockKeyhole, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { canAssignRole, normalizeAdminRole } from "@/lib/admin/authorization";
import type { AdminUser } from "@/lib/admin/service";
import type { PublicUser } from "@/lib/auth/service";
import { controlFetch } from "@/lib/control/client";

type DialogState = { user: AdminUser; action: "lock" | "deactivate" } | null;

function statusLabel(user: AdminUser) {
  if (user.accountStatus === "locked") return "Đã khóa";
  if (user.accountStatus === "disabled") {
    if (user.disabledForever) return "Vô hiệu hóa vĩnh viễn";
    return user.disabledUntil ? `Đến ${new Date(user.disabledUntil).toLocaleDateString("vi-VN")}` : "Đã vô hiệu hóa";
  }
  return "Hoạt động";
}

export function AdminUserTable({ users, actor }: { users: AdminUser[]; actor: PublicUser }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [duration, setDuration] = useState<"days" | "forever">("days");

  async function mutate(id: number, payload: object) {
    setBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(`/api/control/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("Đã cập nhật tài khoản.");
      closeDialog();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  function closeDialog() {
    setDialog(null);
    setReason("");
    setDays(7);
    setDuration("days");
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 border border-[#38BDF8]/15 bg-[#0D1225] p-4 sm:grid-cols-[1fr_180px_180px_auto]">
        <label className="relative"><span className="sr-only">Tìm thành viên</span><Search className="absolute left-3 top-3.5 size-4 text-[#94A3B8]" /><input name="query" aria-label="Tìm thành viên" placeholder="Tên, username hoặc email" className="h-11 w-full border border-[#38BDF8]/20 bg-[#080B18] pl-10 pr-3 text-sm text-[#F8FAFC] focus:border-[#67E8F9] focus:outline-none" /></label>
        <select name="role" aria-label="Lọc vai trò" className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 text-sm text-[#F8FAFC]"><option value="all">Mọi vai trò</option><option value="admin">Admin</option><option value="staff">Staff</option><option value="player">Player</option></select>
        <select name="status" aria-label="Lọc trạng thái" className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 text-sm text-[#F8FAFC]"><option value="all">Mọi trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option><option value="disabled">Đã vô hiệu hóa</option></select>
        <button className="server-button px-5 focus-ring">Lọc</button>
      </form>

      {message ? <p role="status" className="border border-[#67E8F9]/20 bg-[#38BDF8]/10 p-3 text-sm text-[#E0F2FE]">{message}</p> : null}

      <div className="overflow-x-auto border border-[#38BDF8]/15">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-[#11162A] text-xs uppercase tracking-wider text-[#94A3B8]"><tr><th className="p-4">Thành viên</th><th className="p-4">Vai trò</th><th className="p-4">Trạng thái</th><th className="p-4">Hoạt động</th><th className="p-4 text-right">Kiểm soát</th></tr></thead>
          <tbody className="divide-y divide-[#38BDF8]/10 bg-[#0A0F20]">
            {users.map((user) => {
              const protectedTarget = normalizeAdminRole(user.roleName) === "owner" || actor.id === user.id || (normalizeAdminRole(actor.roleName) === "admin" && normalizeAdminRole(user.roleName) === "admin");
              const statusTone = user.accountStatus === "active" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : user.accountStatus === "locked" ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-amber-300/30 bg-amber-300/10 text-amber-200";
              return (
                <tr key={user.id} className="hover:bg-[#38BDF8]/5">
                  <td className="p-4"><strong className="block text-[#F8FAFC]">{user.displayName}</strong><span className="text-xs text-[#94A3B8]">@{user.username}{user.email ? ` · ${user.email}` : ""}</span></td>
                  <td className="p-4"><select aria-label={`Vai trò của ${user.username}`} value={user.roleName} disabled={!canAssignRole(actor.roleName, user.roleName, "staff") && user.roleName !== "player"} onChange={(event) => mutate(user.id, { action: "role", role: event.target.value })} className="h-10 border border-[#8B5CF6]/25 bg-[#11162A] px-3 text-[#E0F2FE]"><option value="owner">Owner</option><option value="admin">Admin</option><option value="staff">Staff</option><option value="player">Player</option></select></td>
                  <td className="p-4"><span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-xs font-bold ${statusTone}`}><span className="size-1.5 bg-current" />{statusLabel(user)}</span>{user.disabledReason ? <small className="mt-2 block max-w-56 text-[#94A3B8]">{user.disabledReason}</small> : null}</td>
                  <td className="p-4 text-[#94A3B8]">{user.sessions} phiên · {user.posts} bài</td>
                  <td className="p-4"><div className="flex justify-end gap-2">
                    <button type="button" disabled={protectedTarget} onClick={() => user.accountStatus === "locked" ? mutate(user.id, { action: "lock", locked: false }) : setDialog({ user, action: "lock" })} className="focus-ring inline-flex min-h-10 items-center gap-2 border border-[#38BDF8]/20 px-3 text-xs font-bold text-[#E0F2FE] hover:bg-[#38BDF8]/10">{user.accountStatus === "locked" ? <UnlockKeyhole className="size-4" /> : <LockKeyhole className="size-4" />}{user.accountStatus === "locked" ? "Mở khóa" : "Khóa"}</button>
                    <button type="button" disabled={protectedTarget} onClick={() => user.accountStatus === "disabled" ? mutate(user.id, { action: "reactivate" }) : setDialog({ user, action: "deactivate" })} className="focus-ring inline-flex min-h-10 items-center gap-2 border border-amber-300/25 px-3 text-xs font-bold text-amber-200 hover:bg-amber-300/10">{user.accountStatus === "disabled" ? <TimerReset className="size-4" /> : <Ban className="size-4" />}{user.accountStatus === "disabled" ? "Kích hoạt" : "Vô hiệu hóa"}</button>
                    <button type="button" disabled={protectedTarget} onClick={() => mutate(user.id, { action: "revoke-sessions" })} className="focus-ring inline-flex min-h-10 items-center gap-2 border border-[#8B5CF6]/25 px-3 text-xs font-bold text-[#C4B5FD] hover:bg-[#8B5CF6]/10"><RefreshCw className="size-4" />Thu hồi phiên</button>
                    <button type="button" disabled={protectedTarget || !user.email} onClick={() => mutate(user.id, { action: "request-password-reset" })} className="focus-ring inline-flex min-h-10 items-center gap-2 border border-[#38BDF8]/25 px-3 text-xs font-bold text-[#67E8F9] hover:bg-[#38BDF8]/10"><Mail className="size-4" />Gửi email đặt lại mật khẩu</button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!users.length ? <p className="bg-[#0A0F20] p-10 text-center text-[#94A3B8]">Không tìm thấy thành viên phù hợp.</p> : null}
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#030510]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
          <div className="w-full max-w-lg border border-[#8B5CF6]/40 bg-[#0D1225] p-6 shadow-2xl">
            <div className="flex justify-between"><Shield className="size-6 text-[#67E8F9]" /><button className="focus-ring p-2" onClick={closeDialog} aria-label="Đóng"><X className="size-5" /></button></div>
            <h2 id="user-dialog-title" className="mt-4 font-pixel text-base text-[#F8FAFC]">{dialog.action === "lock" ? "Khóa tài khoản" : "Vô hiệu hóa tài khoản"}</h2>
            <p className="mt-3 text-sm leading-6 text-[#94A3B8]">@{dialog.user.username}. Toàn bộ phiên website và Control đang hoạt động sẽ bị thu hồi ngay.</p>
            {dialog.action === "deactivate" ? <fieldset className="mt-5 grid gap-3"><legend className="mb-2 text-sm font-bold text-[#E0F2FE]">Thời hạn</legend><label className="flex items-center gap-3 border border-[#38BDF8]/20 p-3"><input type="radio" checked={duration === "days"} onChange={() => setDuration("days")} />Từ 1 đến 365 ngày</label>{duration === "days" ? <input aria-label="Số ngày vô hiệu hóa" type="number" min={1} max={365} value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-11 border border-[#38BDF8]/20 bg-[#080B18] px-3 text-[#F8FAFC]" /> : null}{actor.roleName === "owner" ? <label className="flex items-center gap-3 border border-rose-400/20 p-3 text-rose-200"><input type="radio" checked={duration === "forever"} onChange={() => setDuration("forever")} />Vĩnh viễn</label> : null}</fieldset> : null}
            <label className="mt-5 block text-sm font-bold text-[#E0F2FE]">Lý do<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={300} className="mt-2 min-h-24 w-full border border-[#38BDF8]/20 bg-[#080B18] p-3 font-normal text-[#F8FAFC]" /></label>
            <div className="mt-6 flex justify-end gap-3"><button className="server-button server-button-dark px-4 py-2" onClick={closeDialog}>Hủy</button><button disabled={busy || reason.trim().length < 3 || (duration === "days" && (days < 1 || days > 365))} className="server-button px-4 py-2" onClick={() => mutate(dialog.user.id, dialog.action === "lock" ? { action: "lock", locked: true, reason } : { action: "deactivate", duration, ...(duration === "days" ? { days } : {}), reason })}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
