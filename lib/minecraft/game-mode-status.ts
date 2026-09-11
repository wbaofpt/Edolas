import type { GameMode } from "../types.ts";
import type { PublicMinecraftStatus } from "./public-status.ts";

export function mergeGameModeTelemetry(modes: GameMode[], status: PublicMinecraftStatus | null): GameMode[] {
  const groups = new Map(status?.groups.map((group) => [group.key, group]) ?? []);
  return modes.map((mode) => {
    const group = groups.get(mode.slug);
    return {
      ...mode,
      telemetry: {
        status: group?.status ?? "offline",
        online: group?.online ?? 0
      }
    };
  });
}
