"use client";

import { useEffect, useState } from "react";
import type { PublicMinecraftStatus } from "@/lib/minecraft/public-status";

const labels = { online: "ONLINE", offline: "OFFLINE" } as const;

export function MinecraftNetworkStatus({ initialStatus }: { initialStatus: PublicMinecraftStatus | null }) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function schedule() {
      if (!cancelled && document.visibilityState === "visible") timer = setTimeout(refresh, 10_000);
    }

    async function refresh() {
      try {
        const response = await fetch("/api/minecraft/status", { cache: "no-store" });
        const body = await response.json();
        if (!cancelled) setStatus(response.ok && body.ok ? body.status : null);
      } catch {
        if (!cancelled) setStatus(null);
      }
      schedule();
    }

    function handleVisibility() {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") void refresh();
    }

    schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const level = status?.status ?? "offline";
  return <span className={`connection-dock-online is-${level}`} aria-live="polite"><i aria-hidden="true" /><span>{labels[level]}</span><b>{status?.online ?? 0}</b></span>;
}
