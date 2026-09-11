import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";
import { aggregateMinecraftServers, isFreshMinecraftSnapshot, type MinecraftStatusLevel, type PublicMinecraftStatus, type PublicMinecraftServerRow } from "./public-status.ts";
import type { TelemetryPluginHealth, TelemetryWorld } from "./types.ts";

type ControlServerRow = PublicMinecraftServerRow & {
  display_name: string;
  max_players: number | string;
  minecraft_version: string;
  paper_version: string;
  tps_1m: number | string;
  tps_5m: number | string;
  tps_15m: number | string;
  mspt: number | string;
  memory_used_bytes: number | string;
  memory_max_bytes: number | string;
  uptime_seconds: number | string;
  worlds_json: string | TelemetryWorld[];
  plugin_health_json: string | TelemetryPluginHealth[];
  reported_at: Date | string;
};

type ControlPlayerRow = { server_id: string; player_uuid: string; username: string; ping: number | string; world_name: string; observed_at: Date | string };
type ControlGameModeRow = { slug: string; name: string };

export type ControlMinecraftPlayer = { uuid: string; username: string; ping: number; world: string; observedAt: string };

export type ControlMinecraftServer = {
  id: string;
  group: string;
  displayName: string;
  status: Exclude<MinecraftStatusLevel, "degraded">;
  online: number;
  max: number;
  minecraftVersion: string;
  paperVersion: string;
  tps: { one: number; five: number; fifteen: number };
  mspt: number;
  memory: { used: number; max: number };
  uptimeSeconds: number;
  reportedAt: string;
  lastSeenAt: string;
  worlds: TelemetryWorld[];
  pluginHealth: TelemetryPluginHealth[];
  players: ControlMinecraftPlayer[];
};

export type ControlMinecraftGroup = {
  key: string;
  label: string;
  mapped: boolean;
  status: MinecraftStatusLevel;
  online: number;
  activeServers: number;
  totalServers: number;
  servers: ControlMinecraftServer[];
};

export type ControlMinecraftStatus = { network: PublicMinecraftStatus; groups: ControlMinecraftGroup[]; servers: ControlMinecraftServer[] };

function jsonArray<T>(value: string | T[], guard: (item: unknown) => item is T): T[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

function isWorld(value: unknown): value is TelemetryWorld {
  const item = value as TelemetryWorld;
  return Boolean(item && typeof item.name === "string" && Number.isFinite(item.players) && Number.isFinite(item.loadedChunks));
}

function isPlugin(value: unknown): value is TelemetryPluginHealth {
  const item = value as TelemetryPluginHealth;
  return Boolean(item && typeof item.name === "string" && typeof item.version === "string" && typeof item.enabled === "boolean");
}

function iso(value: Date | string) { return new Date(value).toISOString(); }
function numeric(value: number | string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function groupLabel(key: string) { return key.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

export async function readControlMinecraftStatus(db: Pick<Pool, "query"> = getPool(), now = new Date()): Promise<ControlMinecraftStatus> {
  const [serverResult, playerResult, gameModeResult] = await Promise.all([
    db.query("SELECT server_id,group_key,display_name,minecraft_version,paper_version,online_players,max_players,tps_1m,tps_5m,tps_15m,mspt,memory_used_bytes,memory_max_bytes,uptime_seconds,worlds_json,plugin_health_json,reported_at,last_seen_at FROM minecraft_servers ORDER BY group_key,server_id"),
    db.query("SELECT server_id,player_uuid,username,ping,world_name,observed_at FROM minecraft_online_players ORDER BY username,server_id"),
    db.query("SELECT slug,name FROM game_modes WHERE deleted_at IS NULL ORDER BY id")
  ]) as [[ControlServerRow[], unknown], [ControlPlayerRow[], unknown], [ControlGameModeRow[], unknown]];
  const serverRows = serverResult[0];
  const network = aggregateMinecraftServers(serverRows, now);
  const playersByServer = new Map<string, ControlMinecraftPlayer[]>();

  for (const player of playerResult[0]) {
    const list = playersByServer.get(player.server_id) ?? [];
    list.push({ uuid: player.player_uuid, username: player.username, ping: numeric(player.ping), world: player.world_name, observedAt: iso(player.observed_at) });
    playersByServer.set(player.server_id, list);
  }

  const servers: ControlMinecraftServer[] = serverRows.map((row) => {
      const fresh = isFreshMinecraftSnapshot(new Date(row.last_seen_at), now);
      return {
        id: row.server_id,
        group: row.group_key,
        displayName: row.display_name,
        status: fresh ? "online" : "offline",
        online: fresh ? numeric(row.online_players) : 0,
        max: numeric(row.max_players),
        minecraftVersion: row.minecraft_version,
        paperVersion: row.paper_version,
        tps: { one: numeric(row.tps_1m), five: numeric(row.tps_5m), fifteen: numeric(row.tps_15m) },
        mspt: numeric(row.mspt),
        memory: { used: numeric(row.memory_used_bytes), max: numeric(row.memory_max_bytes) },
        uptimeSeconds: numeric(row.uptime_seconds),
        reportedAt: iso(row.reported_at),
        lastSeenAt: iso(row.last_seen_at),
        worlds: jsonArray(row.worlds_json, isWorld),
        pluginHealth: jsonArray(row.plugin_health_json, isPlugin),
        players: fresh ? playersByServer.get(row.server_id) ?? [] : []
      };
    });
  const modes = new Map(gameModeResult[0].map((mode) => [mode.slug, mode.name]));
  const serversByGroup = new Map<string, ControlMinecraftServer[]>();
  for (const server of servers) {
    const list = serversByGroup.get(server.group) ?? [];
    list.push(server);
    serversByGroup.set(server.group, list);
  }
  const groups = [...serversByGroup.entries()].map(([key, groupServers]): ControlMinecraftGroup => {
    const activeServers = groupServers.filter((server) => server.status === "online").length;
    return {
      key,
      label: modes.get(key) ?? groupLabel(key),
      mapped: modes.has(key),
      status: activeServers === 0 ? "offline" : activeServers === groupServers.length ? "online" : "degraded",
      online: groupServers.reduce((total, server) => total + server.online, 0),
      activeServers,
      totalServers: groupServers.length,
      servers: groupServers
    };
  }).sort((left, right) => Number(right.mapped) - Number(left.mapped) || left.label.localeCompare(right.label));

  return { network, groups, servers };
}
