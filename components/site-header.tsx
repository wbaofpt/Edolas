"use client";

import Link from "next/link";
import { LogIn, Menu, MessageCircleMore, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { BrandWordmark } from "@/components/brand-wordmark";
import { SiteSearch } from "@/components/site-search";
import type { PublicUser } from "@/lib/auth/service";
import { navItems } from "@/lib/content";

export function SiteHeader({
  user,
  discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ??
    "https://discord.gg/edolassg",
  maintenanceMode = false,
}: {
  user: PublicUser | null;
  discordUrl?: string;
  maintenanceMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [desktopAccountOpen, setDesktopAccountOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const active = (href: string) =>
    href.includes("#")
      ? href === "/#home" && pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const mobileMenu: Variants = {
    closed: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -10 },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reducedMotion ? 0 : 0.24,
        staggerChildren: reducedMotion ? 0 : 0.05,
      },
    },
    exit: {
      opacity: reducedMotion ? 1 : 0,
      y: reducedMotion ? 0 : -8,
      transition: { duration: reducedMotion ? 0 : 0.16 },
    },
  };
  const mobileItem: Variants = {
    closed: { opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : -12 },
    open: {
      opacity: 1,
      x: 0,
      transition: { duration: reducedMotion ? 0 : 0.22 },
    },
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMobileAccountOpen(false);
        mobileButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [open]);

  function toggleMobileMenu() {
    setOpen((value) => !value);
    setDesktopAccountOpen(false);
    setMobileAccountOpen(false);
  }

  function handleDesktopAccountOpen(nextOpen: boolean) {
    setDesktopAccountOpen(nextOpen);
    if (nextOpen) setMobileAccountOpen(false);
  }

  function handleMobileAccountOpen(nextOpen: boolean) {
    setMobileAccountOpen(nextOpen);
    if (nextOpen) setDesktopAccountOpen(false);
  }

  return (
    <header className={`site-header ${scrolled || open ? "is-scrolled" : ""}`}>
      <div className="site-header-bar">
        <Link
          href="/#home"
          className="site-logo flex shrink-0 items-center rounded-md focus-ring"
          aria-label="EdolasSG - Trang chủ"
        >
          <BrandWordmark variant="header" />
        </Link>

        <nav className="site-header-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`nav-energy-link focus-ring ${active(item.href) ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <SiteSearch />

        <div className="site-header-actions">
          {user ? (
            <AccountMenu
              user={user}
              open={desktopAccountOpen}
              onOpenChange={handleDesktopAccountOpen}
            />
          ) : (
            <Link
              href="/login"
              className="server-button server-button-dark px-4 py-2 text-sm focus-ring"
            >
              <LogIn className="h-4 w-4" /> Đăng nhập
            </Link>
          )}
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Mở Discord Edolas"
            className="server-button site-discord-button focus-ring"
          >
            <MessageCircleMore aria-hidden="true" />
            <span>Discord</span>
          </a>
        </div>

        <button
          ref={mobileButtonRef}
          type="button"
          onClick={toggleMobileMenu}
          className="site-mobile-trigger focus-ring"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Đóng menu" : "Mở menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {maintenanceMode ? (
        <div className="border-t border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-amber-200">
          Hệ thống đang ở chế độ bảo trì
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="mobile-nav"
            variants={mobileMenu}
            initial="closed"
            animate="open"
            exit="exit"
            className="site-mobile-panel"
          >
            <nav className="site-mobile-nav" aria-label="Điều hướng di động">
              {navItems.map((item) => (
                <motion.div key={item.href} variants={mobileItem}>
                  <Link
                    href={item.href}
                    aria-current={active(item.href) ? "page" : undefined}
                    onClick={() => {
                      setOpen(false);
                      setMobileAccountOpen(false);
                    }}
                    className={`focus-ring ${active(item.href) ? "is-active" : ""}`}
                  >
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              ))}
              <motion.div variants={mobileItem} className="site-mobile-actions">
                {user ? (
                  <AccountMenu
                    user={user}
                    compact
                    open={mobileAccountOpen}
                    onOpenChange={handleMobileAccountOpen}
                  />
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="server-button server-button-dark px-3 py-3 text-sm focus-ring"
                  >
                    <LogIn className="h-4 w-4" /> Đăng nhập
                  </Link>
                )}
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="server-button px-3 py-3 text-sm focus-ring"
                >
                  <MessageCircleMore className="h-4 w-4" /> Discord
                </a>
              </motion.div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
