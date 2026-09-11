import test from "node:test";
import assert from "node:assert/strict";
import { aggregateMinecraftServers, readPublicMinecraftStatus } from "../lib/minecraft/public-status.ts";

const now = new Date("2026-08-13T12:00:30.000Z");
const rows = [
  { server_id: "survival-01", group_key: "survival", display_name: "Survival 01", online_players: 18, max_players: 100, last_seen_at: new Date("2026-08-13T12:00:20.000Z") },
  { server_id: "survival-02", group_key: "survival", display_name: "Survival 02", online_players: 7, max_players: 100, last_seen_at: new Date("2026-08-13T11:59:59.000Z") },
  { server_id: "skyblock-01", group_key: "skyblock", display_name: "Skyblock 01", online_players: 4, max_players: 80, last_seen_at: new Date("2026-08-13T12:00:15.000Z") }
];

test("public telemetry aggregates fresh backends and keeps partly stale groups online", () => {
  const status = aggregateMinecraftServers(rows, now);
  assert.equal(status.status, "online");
  assert.equal(status.online, 22);
  assert.equal("max" in status, false);
  assert.deepEqual(status.groups.find((group) => group.key === "survival"), {
    key: "survival",
    label: "Survival",
    status: "online",
    online: 18,
    activeServers: 1,
    totalServers: 2
  });
  assert.equal(status.groups.find((group) => group.key === "skyblock")?.online, 4);
  assert.equal(status.lastUpdatedAt, "2026-08-13T12:00:20.000Z");
  assert.equal(JSON.stringify(status).includes("username"), false);
  assert.equal(JSON.stringify(status).includes("plugin"), false);
});

test("public telemetry treats exactly thirty seconds as fresh", () => {
  const status = aggregateMinecraftServers([{ ...rows[0], last_seen_at: new Date("2026-08-13T12:00:00.000Z") }], now);
  assert.equal(status.status, "online");
  assert.equal(status.online, 18);
});

test("public status returns null when telemetry storage is unavailable or malformed", async () => {
  assert.equal(await readPublicMinecraftStatus({ query: async () => { throw new Error("missing table"); } } as never, now), null);
  assert.equal(await readPublicMinecraftStatus({ query: async () => [[{ stat_key: "online_today" }], undefined] as const } as never, now), null);
});
