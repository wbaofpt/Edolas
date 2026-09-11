"use client";

import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) { setMessage("Hai mật khẩu chưa trùng khớp."); return; }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setComplete(true);
      setMessage("Mật khẩu đã được cập nhật và các phiên cũ đã được thu hồi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reset-password-card">
      <span className="control-kicker">ACCOUNT RECOVERY</span>
      <div className="reset-password-icon">{complete ? <CheckCircle2 aria-hidden="true" /> : <KeyRound aria-hidden="true" />}</div>
      <h1>{complete ? "Mật khẩu đã sẵn sàng" : "Tạo mật khẩu mới"}</h1>
      <p>{complete ? "Bạn có thể quay lại và đăng nhập bằng mật khẩu vừa tạo." : "Liên kết này chỉ dùng một lần. Mật khẩu mới cần ít nhất 8 ký tự."}</p>
      {!complete ? <form onSubmit={submit} className="control-access-form"><label htmlFor="reset-password">Mật khẩu mới</label><div className="control-access-input"><KeyRound aria-hidden="true" /><input id="reset-password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div><label htmlFor="reset-confirm">Nhập lại mật khẩu</label><div className="control-access-input"><KeyRound aria-hidden="true" /><input id="reset-confirm" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></div><button disabled={busy || !token} className="control-primary-button">{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}{busy ? "Đang cập nhật..." : "Đổi mật khẩu"}</button></form> : <Link href="/login" className="control-primary-button">Đến trang đăng nhập</Link>}
      <p className="control-access-status" aria-live="polite">{!token && !complete ? "Liên kết thiếu token đặt lại mật khẩu." : message}</p>
    </section>
  );
}
