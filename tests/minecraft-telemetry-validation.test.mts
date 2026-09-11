import test from "node:test";
import assert from "node:assert/strict";
import { parseTelemetryPayload } from "../lib/minecraft/validation.ts";

function validPayload() {
  return {
    schemaVersion: 1,
    reportedAt: "2026-08-13T12:00:00.000Z",
    server: {
      id: "survival-01",
      group: "survival",
      displayName: "Survival 01",
      minecraftVersion: "1.21.1",
      paperVersion: "1.21.1-123",
      startedAt: "2026-08-13T10:00:00.000Z",
      uptimeSeconds: 7200
    },
    capacity: { online: 1, max: 100 },
    performance: { tps1m: 20, tps5m: 19.9, tps15m: 19.8, mspt: 12.5, memoryUsedBytes: 1024, memoryMaxBytes: 4096 },
    worlds: [{ name: "world", players: 1, loadedChunks: 120 }],
    players: [{ uuid: "123e4567-e89b-12d3-a456-426614174000", username: "Bao_21", ping: 42, world: "world" }],
    pluginHealth: [{ name: "LuckPerms", version: "5.4.0", enabled: true }]
  };
}

test("telemetry payload parser returns a bounded schema v1 snapshot", () => {
  const parsed = parseTelemetryPayload(validPayload());
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.server.id, "survival-01");
  assert.equal(parsed.players[0].username, "Bao_21");
});

test("telemetry payload parser rejects unsupported and unsafe values", () => {
  assert.throws(() => parseTelemetryPayload({ ...validPayload(), schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => parseTelemetryPayload({ ...validPayload(), capacity: { online: -1, max: 100 } }), /capacity.online/);
  assert.throws(() => parseTelemetryPayload({ ...validPayload(), worlds: Array.from({ length: 33 }, (_, index) => ({ name: `world-${index}`, players: 0, loadedChunks: 0 })) }), /worlds/);
  assert.throws(() => parseTelemetryPayload({ ...validPayload(), players: [{ uuid: "invalid", username: "Bao", ping: 1, world: "world" }] }), /players\[0\].uuid/);
  assert.throws(() => parseTelemetryPayload({ ...validPayload(), players: Array.from({ length: 1001 }, () => validPayload().players[0]) }), /players/);
});

test("telemetry payload enforces capacity and memory consistency", () => {
  assert.throws(() => parseTelemetryPayload({ ...validPayload(), capacity: { online: 2, max: 1 } }), /capacity.online/);
  assert.throws(() => parseTelemetryPayload({ ...validPayload(), performance: { ...validPayload().performance, memoryUsedBytes: 5000, memoryMaxBytes: 4096 } }), /memoryUsedBytes/);
});

test("telemetry payload allows a bounded player directory below the real online count", () => {
  const payload = validPayload();
  const parsed = parseTelemetryPayload({ ...payload, capacity: { online: 2, max: 100 } });
  assert.equal(parsed.capacity.online, 2);
  assert.equal(parsed.players.length, 1);
  assert.throws(() => parseTelemetryPayload({ ...payload, capacity: { online: 0, max: 100 } }), /players length/);
});
