"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type AuthMode = "login" | "register";

type AuthShellProps = {
  mode: AuthMode;
  children: ReactNode;
};

const authCopy: Record<AuthMode, { kicker: string; title: string }> = {
  login: {
    kicker: "Cổng người chơi",
    title: "Chào mừng trở lại"
  },
  register: {
    kicker: "Hồ sơ mới",
    title: "Gia nhập Edolas"
  }
};

export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = authCopy[mode];

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <aside className="auth-visual">
          <div className="auth-visual-media">
            <Image
              src="/images/auth-portal.png"
              alt="Cánh cổng xanh dẫn vào thế giới Edolas"
              fill
              priority
              sizes="(max-width: 860px) 100vw, 55vw"
              className="auth-visual-image"
            />
            <div className="auth-visual-overlay" aria-hidden="true" />
            <div className="auth-portal-scan" aria-hidden="true" />
          </div>

          <div className="auth-visual-content">
            <Link href="/#home" className="auth-back-link focus-ring">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Về trang chủ
            </Link>

            <div className="auth-visual-footer">
              <p className="auth-wordmark">
                EDOLAS<span>SG</span>
              </p>
              <span className="auth-realm-status">
                <span className="auth-status-dot" aria-hidden="true" />
                Realm online
              </span>
            </div>
          </div>
        </aside>

        <section className="auth-panel" id="auth-content">
          <div className="auth-panel-inner">
            <nav className="auth-mode-nav" aria-label="Chọn trang tài khoản">
              <Link href="/login" aria-current={mode === "login" ? "page" : undefined} className={mode === "login" ? "auth-mode-link is-active focus-ring" : "auth-mode-link focus-ring"}>
                Đăng nhập
              </Link>
              <Link href="/register" aria-current={mode === "register" ? "page" : undefined} className={mode === "register" ? "auth-mode-link is-active focus-ring" : "auth-mode-link focus-ring"}>
                Đăng ký
              </Link>
            </nav>

            <header className="auth-heading">
              <p className="auth-kicker">{copy.kicker}</p>
              <h1 className="auth-title text-balance">{copy.title}</h1>
            </header>

            <div className="auth-body">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
