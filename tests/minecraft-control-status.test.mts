import test from "node:test";
import assert from "node:assert/strict";
import { readControlMinecraftStatus } from "../lib/minecraft/control-status.ts";

const now = new Date("2026-08-13T12:00:30.000Z");

test("control telemetry exposes detailed fresh server health and players", async () => {
  const db = { query: async (sql: string) => {
    if (sql.includes("FROM game_modes")) return [[
      { slug: "survival", name: "Survival" }
    ], undefined] as const;
    if (sql.includes("minecraft_online_players")) return [[
      { server_id: "survival-01", player_uuid: "123e4567-e89b-12d3-a456-426614174000", username: "Bao_21", ping: 42, world_name: "world", observed_at: new Date("2026-08-13T12:00:20Z") },
      { server_id: "stale-01", player_uuid: "123e4567-e89b-12d3-a456-426614174001", username: "Hidden", ping: 99, world_name: "world", observed_at: new Date("2026-08-13T11:00:00Z") }
    ], undefined] as const;
    return [[
      { server_id: "survival-01", group_key: "survival", display_name: "Survival 01", minecraft_version: "1.21.1", paper_version: "1.21.1-123", online_players: 1, max_players: 100, tps_1m: 20, tps_5m: 19.9, tps_15m: 19.8, mspt: 12.5, memory_used_bytes: 1024, memory_max_bytes: 4096, uptime_seconds: 7200, worlds_json: JSON.stringify([{ name: "world", players: 1, loadedChunks: 120 }]), plugin_health_json: JSON.stringify([{ name: "LuckPerms", version: "5.4", enabled: true }]), reported_at: now, last_seen_at: new Date("2026-08-13T12:00:20Z") },
      { server_id: "stale-01", group_key: "survival", display_name: "Stale 01", minecraft_version: "1.21.1", paper_version: "1.21.1-123", online_players: 1, max_players: 100, tps_1m: 10, tps_5m: 10, tps_15m: 10, mspt: 90, memory_used_bytes: 1024, memory_max_bytes: 4096, uptime_seconds: 7200, worlds_json: "[]", plugin_health_json: "[]", reported_at: now, last_seen_at: new Date("2026-08-13T11:00:00Z") },
      { server_id: "lobby-01", group_key: "lobby", display_name: "Lobby 01", minecraft_version: "1.21.1", paper_version: "1.21.1-123", online_players: 3, max_players: 500, tps_1m: 20, tps_5m: 20, tps_15m: 20, mspt: 5, memory_used_bytes: 1024, memory_max_bytes: 4096, uptime_seconds: 7200, worlds_json: "[]", plugin_health_json: "[]", reported_at: now, last_seen_at: new Date("2026-08-13T12:00:25Z") }
    ], undefined] as const;
  } };

  const status = await readControlMinecraftStatus(db as never, now);
  assert.equal(status.network.status, "online");
  assert.equal(status.servers[0].players[0].username, "Bao_21");
  assert.deepEqual(status.servers[0].pluginHealth, [{ name: "LuckPerms", version: "5.4", enabled: true }]);
  assert.deepEqual(status.servers[1].players, []);
  assert.deepEqual(status.groups.find((group) => group.key === "survival"), {
    key: "survival",
    label: "Survival",
    mapped: true,
    status: "degraded",
    online: 1,
    activeServers: 1,
    totalServers: 2,
    servers: status.servers.filter((server) => server.group === "survival")
  });
  assert.equal(status.groups.find((group) => group.key === "lobby")?.mapped, false);
  assert.equal(status.groups.find((group) => group.key === "lobby")?.online, 3);
});
