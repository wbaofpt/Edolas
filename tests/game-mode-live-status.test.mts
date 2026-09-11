import test from "node:test";
import assert from "node:assert/strict";
import { mergeGameModeTelemetry } from "../lib/minecraft/game-mode-status.ts";
import type { GameMode } from "../lib/types.ts";
import type { PublicMinecraftStatus } from "../lib/minecraft/public-status.ts";

const modes: GameMode[] = [
  { slug: "survival", name: "Survival", summary: "Sinh ton", players: "open", accent: "from-a to-b", features: [], telemetry: { status: "offline", online: 0 } },
  { slug: "creative", name: "Creative", summary: "Xay dung", players: "open", accent: "from-a to-b", features: [], telemetry: { status: "online", online: 99 } }
];

test("live game mode telemetry maps API groups by slug and closes missing groups", () => {
  const status: PublicMinecraftStatus = {
    status: "online",
    online: 7,
    lastUpdatedAt: "2026-08-14T12:00:00.000Z",
    groups: [{ key: "survival", label: "Survival", status: "online", online: 7, activeServers: 1, totalServers: 1 }]
  };

  const updated = mergeGameModeTelemetry(modes, status);
  assert.deepEqual(updated.map((mode) => mode.telemetry), [
    { status: "online", online: 7 },
    { status: "offline", online: 0 }
  ]);
  assert.deepEqual(modes[1]?.telemetry, { status: "online", online: 99 });
});

test("live game mode telemetry fails closed when the status API is unavailable", () => {
  assert.deepEqual(mergeGameModeTelemetry(modes, null).map((mode) => mode.telemetry), [
    { status: "offline", online: 0 },
    { status: "offline", online: 0 }
  ]);
});
