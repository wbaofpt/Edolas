"use client";

import { ArrowLeft, KeyRound, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Stage = "password" | "otp";

export function ControlAccessForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("password");
  const [emailHint, setEmailHint] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/control/access/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: form.get("password") })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEmailHint(data.emailHint);
      setStage("otp");
      setMessage("Mã bảo mật đã được gửi. Mã có hiệu lực trong 10 phút.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể bắt đầu xác minh.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/control/access/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: form.get("code") })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.replace("/control");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xác minh mã bảo mật.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="control-access-panel" aria-labelledby="control-access-title">
      <div className="control-access-progress" aria-label={`Bước ${stage === "password" ? 1 : 2} trên 2`}>
        <span className="is-complete"><ShieldCheck aria-hidden="true" />1</span>
        <i className={stage === "otp" ? "is-complete" : ""} />
        <span className={stage === "otp" ? "is-complete" : ""}><MailCheck aria-hidden="true" />2</span>
      </div>

      <div className="control-access-heading">
        <span className="control-kicker">SECURE OPERATIONS GATE</span>
        <h1 id="control-access-title">{stage === "password" ? "Xác nhận danh tính" : "Kiểm tra hộp thư"}</h1>
        <p>{stage === "password" ? "Nhập lại mật khẩu để yêu cầu mã OTP dành riêng cho Control Center." : `Nhập mã 6 số vừa gửi tới ${emailHint}.`}</p>
      </div>

      {stage === "password" ? (
        <form onSubmit={submitPassword} className="control-access-form">
          <label htmlFor="control-password">Mật khẩu tài khoản</label>
          <div className="control-access-input"><KeyRound aria-hidden="true" /><input id="control-password" name="password" type="password" autoComplete="current-password" minLength={6} required autoFocus /></div>
          <button disabled={busy} className="control-primary-button">{busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}{busy ? "Đang kiểm tra..." : "Gửi mã bảo mật"}</button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="control-access-form">
          <label htmlFor="control-otp">Mã bảo mật 6 số</label>
          <input id="control-otp" name="code" className="control-otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus aria-describedby="control-access-status" />
          <button disabled={busy} className="control-primary-button">{busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <MailCheck aria-hidden="true" />}{busy ? "Đang xác minh..." : "Mở Control Center"}</button>
          <button type="button" className="control-text-button" onClick={() => { setStage("password"); setMessage(""); }}><ArrowLeft aria-hidden="true" />Dùng lại mật khẩu</button>
        </form>
      )}

      <p id="control-access-status" className="control-access-status" aria-live="polite">{message}</p>
    </section>
  );
}
