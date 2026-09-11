"use client";

import { useRouter } from "next/navigation";
import { CircleCheck, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, useTransition, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useTypingPulse } from "@/components/auth/use-typing-pulse";

type ErrorMap = Record<string, string>;
type LoginTypingField = "identifier" | "password";

export function LoginForm({
  registered = false,
  redirectTo = "/",
}: {
  registered?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [isRedirecting, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ErrorMap>({});
  const { typingField, markTyping } = useTypingPulse<LoginTypingField>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, remember })
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; fieldErrors?: ErrorMap } | null;

      if (!response.ok) {
        setFieldErrors(data?.fieldErrors ?? {});
        setErrorMessage(data?.error ?? "Thông tin đăng nhập không hợp lệ.");
        return;
      }

      startTransition(() => {
        router.replace(redirectTo);
        router.refresh();
      });
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login">
      <form onSubmit={handleSubmit} className="auth-form auth-form-login" noValidate>
        {registered ? (
          <motion.p
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="auth-alert auth-alert-success"
          >
            <CircleCheck className="h-4 w-4" aria-hidden="true" />
            Tài khoản đã được tạo. Hãy đăng nhập để tiếp tục.
          </motion.p>
        ) : null}

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-identifier">
            Email hoặc tên đăng nhập
          </label>
          <div className={typingField === "identifier" ? "auth-input-shell is-typing" : "auth-input-shell"}>
            <input
              id="login-identifier"
              className="auth-input focus-ring"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                markTyping("identifier");
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.identifier;
                  return next;
                });
              }}
              autoComplete="username"
              spellCheck={false}
              required
              aria-invalid={Boolean(fieldErrors.identifier)}
              aria-describedby={fieldErrors.identifier ? "login-identifier-error" : undefined}
              placeholder="Tên đăng nhập hoặc email"
            />
          </div>
          <AnimatePresence>
            {fieldErrors.identifier ? (
              <motion.p
                id="login-identifier-error"
                role="alert"
                initial={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="auth-field-error"
              >
                {fieldErrors.identifier}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">
            Mật khẩu
          </label>
          <div className={typingField === "password" ? "auth-input-shell is-typing" : "auth-input-shell"}>
            <input
              id="login-password"
              className="auth-input auth-input-with-button focus-ring"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                markTyping("password");
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.password;
                  return next;
                });
              }}
              autoComplete="current-password"
              required
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              placeholder="Mật khẩu"
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
              <motion.p
                id="login-password-error"
                role="alert"
                initial={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="auth-field-error"
              >
                {fieldErrors.password}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <label className="auth-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="auth-checkbox"
          />
          <span>Lưu đăng nhập trên thiết bị này</span>
        </label>

        <AnimatePresence mode="popLayout">
          {errorMessage ? (
            <motion.p
              key="login-error"
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

        <button type="submit" disabled={loading || isRedirecting} className="server-button auth-submit focus-ring">
          {loading || isRedirecting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <KeyRound className="h-5 w-5" aria-hidden="true" />}
          Vào server
        </button>
      </form>
    </AuthShell>
  );
}
