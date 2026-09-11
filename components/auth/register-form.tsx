"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Eye, EyeOff, KeyRound, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useTypingPulse } from "@/components/auth/use-typing-pulse";
import { normalizeOtp } from "@/lib/auth/otp";

type ErrorMap = Record<string, string>;
type RegisterTypingField = "displayName" | "username" | "email" | "password" | "referralCode" | "verificationCode";

type AccountState = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  referralCode: string;
};

const initialAccountState: AccountState = {
  displayName: "",
  username: "",
  email: "",
  password: "",
  referralCode: ""
};

export function RegisterForm() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<1 | 2>(1);
  const [isRedirecting, startTransition] = useTransition();
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState<AccountState>(initialAccountState);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [devCode, setDevCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ErrorMap>({});
  const [showPassword, setShowPassword] = useState(false);
  const { typingField, markTyping } = useTypingPulse<RegisterTypingField>();

  useEffect(() => {
    if (step === 2 && !account.email) {
      setStep(1);
    }
  }, [account.email, step]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  function updateAccount<K extends keyof AccountState>(key: K, value: AccountState[K]) {
    setAccount((current) => ({ ...current, [key]: value }));
    if (typeof value === "string") {
      markTyping(key as RegisterTypingField);
    }
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setErrorMessage("");
    setStatusMessage("");
  }

  async function sendVerificationCode(advanceToVerification: boolean) {
    setSendingCode(true);
    setErrorMessage("");
    setFieldErrors({});
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth/request-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email })
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string; devCode?: string; retryAfter?: number } | null;

      if (!response.ok) {
        setResendSeconds(data?.retryAfter ?? 0);
        if (advanceToVerification && response.status === 400) {
          setFieldErrors({ email: data?.error ?? "Email không hợp lệ." });
        } else {
          setErrorMessage(data?.error ?? "Không thể gửi mã xác nhận.");
        }
        return;
      }

      if (advanceToVerification) {
        setStep(2);
        setVerificationCode("");
      }
      setDevCode(data?.devCode ?? "");
      setResendSeconds(data?.retryAfter ?? 60);
      setStatusMessage(advanceToVerification ? "" : (data?.message ?? "Mã xác nhận mới đã được gửi."));
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setSendingCode(false);
    }
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendVerificationCode(true);
  }

  async function finishRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setFieldErrors({});
    setStatusMessage("");

    try {
      const verifyResponse = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email, code: verificationCode })
      });
      const verifyData = (await verifyResponse.json().catch(() => null)) as { error?: string } | null;

      if (!verifyResponse.ok) {
        setFieldErrors({ verificationCode: verifyData?.error ?? "Mã xác nhận không hợp lệ." });
        return;
      }

      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: account.displayName,
          username: account.username,
          email: account.email,
          password: account.password,
          referralCode: account.referralCode || null
        })
      });
      const registerData = (await registerResponse.json().catch(() => null)) as { ok?: boolean; error?: string; fieldErrors?: ErrorMap } | null;

      if (!registerResponse.ok) {
        setFieldErrors(registerData?.fieldErrors ?? {});
        setErrorMessage(registerData?.error ?? "Không thể tạo tài khoản.");
        return;
      }

      startTransition(() => {
        router.replace("/login?registered=1");
        router.refresh();
      });
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="register">
      <div className="auth-stepper" aria-label="Các bước đăng ký">
        <span aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "auth-stepper-item is-active" : "auth-stepper-item"}>01 <span className="auth-stepper-copy">Thông tin</span></span>
        <span className="auth-stepper-line" aria-hidden="true" />
        <span aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "auth-stepper-item is-active" : "auth-stepper-item"}>02 <span className="auth-stepper-copy">Xác nhận</span></span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.form
            key="register-step-1"
            onSubmit={requestCode}
            initial={{ opacity: 0, x: reducedMotion ? 0 : 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -18 }}
            transition={{ duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="auth-form"
            aria-busy={sendingCode}
            noValidate
          >
            <div className="auth-register-grid">
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-display-name">
                Tên hiển thị
              </label>
              <div className={typingField === "displayName" ? "auth-input-shell is-typing" : "auth-input-shell"}>
                <input
                  id="register-display-name"
                  className="auth-input focus-ring"
                  value={account.displayName}
                  onChange={(event) => updateAccount("displayName", event.target.value)}
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  aria-describedby={fieldErrors.displayName ? "register-display-name-error" : undefined}
                  placeholder="Tên mọi người sẽ nhìn thấy"
                />
              </div>
              <AnimatePresence>
                {fieldErrors.displayName ? (
                  <motion.p id="register-display-name-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="auth-field-error">
                    {fieldErrors.displayName}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-username">
                Tên đăng nhập
              </label>
              <div className={typingField === "username" ? "auth-input-shell is-typing" : "auth-input-shell"}>
                <input
                  id="register-username"
                  className="auth-input focus-ring"
                  value={account.username}
                  onChange={(event) => updateAccount("username", event.target.value)}
                  autoComplete="username"
                  spellCheck={false}
                  pattern="[A-Za-z0-9]{3,50}"
                  minLength={3}
                  maxLength={50}
                  title="Chỉ dùng chữ cái không dấu và số"
                  required
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? "register-username-error" : undefined}
                  placeholder="EdolasPlayer26"
                />
              </div>
              <AnimatePresence>
                {fieldErrors.username ? (
                  <motion.p id="register-username-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="auth-field-error">
                    {fieldErrors.username}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="auth-field auth-field-wide">
              <label className="auth-label" htmlFor="register-email">
                Email
              </label>
              <div className={typingField === "email" ? "auth-input-shell is-typing" : "auth-input-shell"}>
                <input
                  id="register-email"
                  className="auth-input focus-ring"
                  type="email"
                  value={account.email}
                  onChange={(event) => {
                    updateAccount("email", event.target.value);
                    setStep(1);
                    setVerificationCode("");
                    setDevCode("");
                  }}
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
                  placeholder="Email"
                />
              </div>
              <AnimatePresence>
                {fieldErrors.email ? (
                  <motion.p id="register-email-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="auth-field-error">
                    {fieldErrors.email}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="auth-field auth-field-wide">
              <label className="auth-label" htmlFor="register-password">
                Mật khẩu
              </label>
              <div className={typingField === "password" ? "auth-input-shell is-typing" : "auth-input-shell"}>
                <input
                  id="register-password"
                  className="auth-input auth-input-with-button focus-ring"
                  type={showPassword ? "text" : "password"}
                  value={account.password}
                  onChange={(event) => updateAccount("password", event.target.value)}
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
                  placeholder="Tối thiểu 6 ký tự"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="auth-password-toggle focus-ring"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <AnimatePresence>
                {fieldErrors.password ? (
                  <motion.p id="register-password-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="auth-field-error">
                    {fieldErrors.password}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="auth-field auth-field-wide">
              <label className="auth-label" htmlFor="register-referral">
                Mã giới thiệu
              </label>
              <div className={typingField === "referralCode" ? "auth-input-shell is-typing" : "auth-input-shell"}>
                <input
                  id="register-referral"
                  className="auth-input focus-ring"
                  value={account.referralCode}
                  onChange={(event) => updateAccount("referralCode", event.target.value)}
                  placeholder="Không bắt buộc"
                />
              </div>
            </div>
            </div>

            <AnimatePresence mode="popLayout">
              {errorMessage ? (
                <motion.p
                  key="register-error-step-1"
                  role="alert"
                  aria-live="polite"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="auth-alert auth-alert-error"
                >
                  {errorMessage}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <button type="submit" disabled={sendingCode} className="server-button auth-submit focus-ring">
              {sendingCode ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <MailCheck className="h-5 w-5" aria-hidden="true" />}
              Gửi mã xác nhận
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="register-step-2"
            onSubmit={finishRegistration}
            initial={{ opacity: 0, x: reducedMotion ? 0 : 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -18 }}
            transition={{ duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="auth-form auth-verification-form"
            aria-busy={sendingCode || submitting || isRedirecting}
            noValidate
          >
            <div className="auth-step-note">
              <span className="auth-mail-symbol" aria-hidden="true">
                <MailCheck className="h-5 w-5" />
              </span>
              <div className="auth-step-note-copy">
                <p className="auth-step-note-label">Kiểm tra hộp thư</p>
                <p>
                  Mã 6 số đã được gửi tới <strong>{account.email}</strong>
                </p>
              </div>
            </div>

            {devCode ? (
              <p className="auth-dev-code" role="status">
                Mã dùng trong môi trường dev: <strong>{devCode}</strong>
              </p>
            ) : null}

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-code">
                Mã xác nhận email
              </label>
              <div className={["auth-code-shell", typingField === "verificationCode" ? "is-typing" : "", fieldErrors.verificationCode ? "is-invalid" : ""].filter(Boolean).join(" ")}>
                <div className="auth-code-cells" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => {
                    const digit = verificationCode[index] ?? "";
                    const activeIndex = Math.min(verificationCode.length, 5);
                    const className = ["auth-code-cell", digit ? "is-filled" : "", index === activeIndex ? "is-active" : ""].filter(Boolean).join(" ");
                    return <span key={index} className={className}>{digit}</span>;
                  })}
                </div>
                <input
                  id="register-code"
                  className="auth-code-native focus-ring"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(event) => {
                    setVerificationCode(normalizeOtp(event.target.value));
                    markTyping("verificationCode");
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.verificationCode;
                      return next;
                    });
                  }}
                  aria-invalid={Boolean(fieldErrors.verificationCode)}
                  aria-describedby={fieldErrors.verificationCode ? "register-code-error" : "register-code-help"}
                />
              </div>
              <p id="register-code-help" className="auth-help">Mã hết hạn sau 10 phút.</p>
              <AnimatePresence>
                {fieldErrors.verificationCode ? (
                  <motion.p id="register-code-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="auth-field-error">
                    {fieldErrors.verificationCode}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="auth-resend-row">
              <span>Chưa nhận được email?</span>
              <button
                type="button"
                className="auth-resend-button focus-ring"
                onClick={() => void sendVerificationCode(false)}
                disabled={sendingCode || resendSeconds > 0}
              >
                {sendingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : "Gửi lại mã"}
              </button>
            </div>

            <div className="auth-step-actions">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMessage("");
                  setStatusMessage("");
                  setFieldErrors({});
                }}
                className="server-button server-button-dark auth-submit focus-ring"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                Quay lại
              </button>

              <button type="submit" disabled={sendingCode || submitting || isRedirecting} className="server-button auth-submit focus-ring">
                {submitting || isRedirecting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <KeyRound className="h-5 w-5" aria-hidden="true" />}
                Xác nhận & tạo tài khoản
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {statusMessage ? (
                <motion.p
                  key="register-status"
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="auth-alert auth-alert-success"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {statusMessage}
                </motion.p>
              ) : null}
              {errorMessage ? (
                <motion.p
                  key="register-error-step-2"
                  role="alert"
                  aria-live="polite"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="auth-alert auth-alert-error"
                >
                  {errorMessage}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>

    </AuthShell>
  );
}
