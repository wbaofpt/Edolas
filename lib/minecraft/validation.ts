import { MINECRAFT_SERVER_ID_PATTERN } from "./config.ts";
import type { TelemetryPlayer, TelemetryPluginHealth, TelemetrySnapshot, TelemetryWorld } from "./types.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/;

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object.`);
  return value as Record<string, unknown>;
}

function stringAt(value: unknown, path: string, max: number, pattern?: RegExp) {
  if (typeof value !== "string") throw new Error(`${path} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max || (pattern && !pattern.test(normalized))) throw new Error(`${path} is invalid.`);
  return normalized;
}

function integerAt(value: unknown, path: string, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > max) throw new Error(`${path} must be a bounded non-negative integer.`);
  return value as number;
}

function numberAt(value: unknown, path: string, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) throw new Error(`${path} must be a bounded non-negative number.`);
  return value;
}

function dateAt(value: unknown, path: string) {
  const text = stringAt(value, path, 40);
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) throw new Error(`${path} must be an ISO date.`);
  return date.toISOString();
}

function arrayAt(value: unknown, path: string, max: number) {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${path} must contain at most ${max} items.`);
  return value;
}

function parseWorld(value: unknown, index: number): TelemetryWorld {
  const path = `worlds[${index}]`;
  const item = objectAt(value, path);
  return {
    name: stringAt(item.name, `${path}.name`, 64),
    players: integerAt(item.players, `${path}.players`, 1_000_000),
    loadedChunks: integerAt(item.loadedChunks, `${path}.loadedChunks`, 1_000_000_000)
  };
}

function parsePlayer(value: unknown, index: number): TelemetryPlayer {
  const path = `players[${index}]`;
  const item = objectAt(value, path);
  return {
    uuid: stringAt(item.uuid, `${path}.uuid`, 36, UUID_PATTERN).toLowerCase(),
    username: stringAt(item.username, `${path}.username`, 16, USERNAME_PATTERN),
    ping: integerAt(item.ping, `${path}.ping`, 1_000_000),
    world: stringAt(item.world, `${path}.world`, 64)
  };
}

function parsePlugin(value: unknown, index: number): TelemetryPluginHealth {
  const path = `pluginHealth[${index}]`;
  const item = objectAt(value, path);
  if (typeof item.enabled !== "boolean") throw new Error(`${path}.enabled must be a boolean.`);
  return {
    name: stringAt(item.name, `${path}.name`, 64),
    version: stringAt(item.version, `${path}.version`, 80),
    enabled: item.enabled
  };
}

export function parseTelemetryPayload(value: unknown): TelemetrySnapshot {
  const root = objectAt(value, "payload");
  if (root.schemaVersion !== 1) throw new Error("schemaVersion must be 1.");
  const server = objectAt(root.server, "server");
  const capacity = objectAt(root.capacity, "capacity");
  const performance = objectAt(root.performance, "performance");

  const online = integerAt(capacity.online, "capacity.online", 1_000_000);
  const max = integerAt(capacity.max, "capacity.max", 1_000_000);
  if (online > max) throw new Error("capacity.online cannot exceed capacity.max.");

  const memoryUsedBytes = integerAt(performance.memoryUsedBytes, "performance.memoryUsedBytes");
  const memoryMaxBytes = integerAt(performance.memoryMaxBytes, "performance.memoryMaxBytes");
  if (memoryUsedBytes > memoryMaxBytes) throw new Error("performance.memoryUsedBytes cannot exceed memoryMaxBytes.");

  const players = arrayAt(root.players, "players", 1_000).map(parsePlayer);
  if (players.length > online) throw new Error("players length cannot exceed capacity.online.");

  return {
    schemaVersion: 1,
    reportedAt: dateAt(root.reportedAt, "reportedAt"),
    server: {
      id: stringAt(server.id, "server.id", 40, MINECRAFT_SERVER_ID_PATTERN),
      group: stringAt(server.group, "server.group", 40, MINECRAFT_SERVER_ID_PATTERN),
      displayName: stringAt(server.displayName, "server.displayName", 80),
      minecraftVersion: stringAt(server.minecraftVersion, "server.minecraftVersion", 40),
      paperVersion: stringAt(server.paperVersion, "server.paperVersion", 120),
      startedAt: dateAt(server.startedAt, "server.startedAt"),
      uptimeSeconds: integerAt(server.uptimeSeconds, "server.uptimeSeconds")
    },
    capacity: { online, max },
    performance: {
      tps1m: numberAt(performance.tps1m, "performance.tps1m", 20.5),
      tps5m: numberAt(performance.tps5m, "performance.tps5m", 20.5),
      tps15m: numberAt(performance.tps15m, "performance.tps15m", 20.5),
      mspt: numberAt(performance.mspt, "performance.mspt", 1_000_000),
      memoryUsedBytes,
      memoryMaxBytes
    },
    worlds: arrayAt(root.worlds, "worlds", 32).map(parseWorld),
    players,
    pluginHealth: arrayAt(root.pluginHealth, "pluginHealth", 128).map(parsePlugin)
  };
}
