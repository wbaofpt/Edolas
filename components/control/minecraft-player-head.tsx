"use client";

import type { CSSProperties } from "react";

export function MinecraftPlayerHead({ username }: { username: string }) {
  const source = `/api/control/minecraft/player-skin/${encodeURIComponent(username)}`;
  const style = { "--minecraft-skin-image": `url("${source}")` } as CSSProperties;

  return (
    <span className="minecraft-player-head" style={style} aria-hidden="true">
      <span className="minecraft-player-head-fallback">{username.charAt(0).toUpperCase() || "?"}</span>
      <span className="minecraft-player-head-face" />
      <span className="minecraft-player-head-overlay" />
    </span>
  );
}
