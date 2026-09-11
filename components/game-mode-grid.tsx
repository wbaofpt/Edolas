"use client";

import { useEffect, useState } from "react";
import { AnimatedCard } from "@/components/animated-card";
import { GameModeCard } from "@/components/game-mode-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import { mergeGameModeTelemetry } from "@/lib/minecraft/game-mode-status";
import type { PublicMinecraftStatus } from "@/lib/minecraft/public-status";
import type { GameMode } from "@/lib/types";

type GameModeGridProps = {
  modes: GameMode[];
  variant?: "home" | "catalog";
};

export function GameModeGrid({ modes, variant = "home" }: GameModeGridProps) {
  const [liveStatus, setLiveStatus] = useState<PublicMinecraftStatus | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule() {
      if (!cancelled && document.visibilityState === "visible") timer = setTimeout(refresh, 10_000);
    }

    async function refresh() {
      try {
        const response = await fetch("/api/minecraft/status", { cache: "no-store" });
        const body = await response.json();
        if (!cancelled) setLiveStatus(response.ok && body.ok ? body.status : null);
      } catch {
        if (!cancelled) setLiveStatus(null);
      }
      schedule();
    }

    function handleVisibility() {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") void refresh();
    }

    void refresh();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const liveModes = liveStatus === undefined ? modes : mergeGameModeTelemetry(modes, liveStatus);

  if (variant === "catalog") {
    return (
      <StaggerGroup className="mt-10 grid gap-5 lg:grid-cols-2">
        {liveModes.map((mode, index) => (
          <StaggerItem key={mode.slug}>
            <GameModeCard mode={mode} index={index} titleAs="h2" />
          </StaggerItem>
        ))}
      </StaggerGroup>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {liveModes.map((mode, index) => (
        <AnimatedCard key={mode.slug} delay={index * 0.06}>
          <GameModeCard mode={mode} index={index} />
        </AnimatedCard>
      ))}
    </div>
  );
}
