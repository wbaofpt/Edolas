import test from "node:test";
import assert from "node:assert/strict";
import { ReplayTelemetryError, RateLimitedTelemetryError, saveTelemetrySnapshot } from "../lib/minecraft/repository.ts";
import type { TelemetrySnapshot } from "../lib/minecraft/types.ts";

const now = new Date("2026-08-13T12:00:00.000Z");
const snapshot: TelemetrySnapshot = {
  schemaVersion: 1,
  reportedAt: "2026-08-13T12:00:00.000Z",
  server: { id: "survival-01", group: "survival", displayName: "Survival 01", minecraftVersion: "1.21.1", paperVersion: "1.21.1-123", startedAt: "2026-08-13T10:00:00.000Z", uptimeSeconds: 7200 },
  capacity: { online: 1, max: 100 },
  performance: { tps1m: 20, tps5m: 19.9, tps15m: 19.8, mspt: 12.5, memoryUsedBytes: 1024, memoryMaxBytes: 4096 },
  worlds: [{ name: "world", players: 1, loadedChunks: 120 }],
  players: [{ uuid: "123e4567-e89b-12d3-a456-426614174000", username: "Bao_21", ping: 42, world: "world" }],
  pluginHealth: [{ name: "LuckPerms", version: "5.4.0", enabled: true }]
};

function fakePool(lastSeen = new Date("1970-01-01T00:00:01.000Z"), nonceError = false) {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query(sql: string) {
      calls.push(sql.startsWith("SELECT last_seen_at") ? "lock" : "query");
      return [[{ last_seen_at: lastSeen }], undefined] as const;
    },
    async execute(sql: string) {
      if (sql.startsWith("INSERT INTO minecraft_telemetry_nonces") && nonceError) throw Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" });
      if (sql.startsWith("INSERT INTO minecraft_servers")) calls.push("seed-server");
      else if (sql.startsWith("INSERT INTO minecraft_telemetry_nonces")) calls.push("nonce");
      else if (sql.startsWith("UPDATE minecraft_servers")) calls.push("snapshot");
      else if (sql.startsWith("DELETE FROM minecraft_online_players")) calls.push("clear-players");
      else if (sql.startsWith("INSERT INTO minecraft_online_players")) calls.push("players");
      else if (sql.startsWith("DELETE FROM minecraft_telemetry_nonces")) calls.push("cleanup");
      return [{ affectedRows: 1 }, undefined] as const;
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  return { calls, pool: { getConnection: async () => connection } };
}

test("accepted telemetry commits snapshot, players and nonce atomically", async () => {
  const fake = fakePool();
  const result = await saveTelemetrySnapshot({ serverId: "survival-01", nonce: "nonce-1234567890abcdef", snapshot, now }, { db: fake.pool as never });

  assert.deepEqual(result, { acceptedAt: now });
  assert.deepEqual(fake.calls, ["begin", "seed-server", "nonce", "lock", "snapshot", "clear-players", "players", "cleanup", "commit", "release"]);
});

test("telemetry repository rejects snapshots accepted less than three seconds apart", async () => {
  const fake = fakePool(new Date("2026-08-13T11:59:58.000Z"));
  await assert.rejects(() => saveTelemetrySnapshot({ serverId: "survival-01", nonce: "nonce-1234567890abcdef", snapshot, now }, { db: fake.pool as never }), RateLimitedTelemetryError);
  assert.deepEqual(fake.calls, ["begin", "seed-server", "nonce", "lock", "rollback", "release"]);
});

test("duplicate telemetry nonce rolls back as replay", async () => {
  const fake = fakePool(new Date("1970-01-01T00:00:01.000Z"), true);
  await assert.rejects(() => saveTelemetrySnapshot({ serverId: "survival-01", nonce: "nonce-1234567890abcdef", snapshot, now }, { db: fake.pool as never }), ReplayTelemetryError);
  assert.deepEqual(fake.calls, ["begin", "seed-server", "rollback", "release"]);
});

test("nonce replay takes precedence over the three-second rate limit", async () => {
  const fake = fakePool(new Date("2026-08-13T11:59:59.000Z"), true);
  await assert.rejects(() => saveTelemetrySnapshot({ serverId: "survival-01", nonce: "nonce-1234567890abcdef", snapshot, now }, { db: fake.pool as never }), ReplayTelemetryError);
});
