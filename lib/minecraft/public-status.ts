import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

export type MinecraftStatusLevel = "online" | "degraded" | "offline";
export type PublicMinecraftStatusLevel = Exclude<MinecraftStatusLevel, "degraded">;

export type PublicMinecraftGroupStatus = {
  key: string;
  label: string;
  status: PublicMinecraftStatusLevel;
  online: number;
  activeServers: number;
  totalServers: number;
};

export type PublicMinecraftStatus = {
  status: PublicMinecraftStatusLevel;
  online: number;
  lastUpdatedAt: string | null;
  groups: PublicMinecraftGroupStatus[];
};

export type PublicMinecraftServerRow = {
  server_id: string;
  group_key: string;
  online_players: number | string;
  last_seen_at: Date | string;
};

function groupLabel(key: string) {
  return key.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function publicLevel(fresh: number): PublicMinecraftStatusLevel {
  return fresh > 0 ? "online" : "offline";
}

export function isFreshMinecraftSnapshot(lastSeen: Date, now: Date) {
  const age = now.getTime() - lastSeen.getTime();
  return age >= 0 && age <= 30_000;
}

export function aggregateMinecraftServers(rows: PublicMinecraftServerRow[], now = new Date()): PublicMinecraftStatus {
  let online = 0;
  let freshServers = 0;
  let latest: Date | null = null;
  const groups = new Map<string, { total: number; fresh: number; online: number }>();

  for (const row of rows) {
    const seen = new Date(row.last_seen_at);
    const fresh = isFreshMinecraftSnapshot(seen, now);
    const serverOnline = fresh ? Math.max(0, Number(row.online_players) || 0) : 0;
    online += serverOnline;
    if (fresh) freshServers += 1;
    if (Number.isFinite(seen.getTime()) && (!latest || seen > latest)) latest = seen;

    const current = groups.get(row.group_key) ?? { total: 0, fresh: 0, online: 0 };
    current.total += 1;
    current.fresh += fresh ? 1 : 0;
    current.online += serverOnline;
    groups.set(row.group_key, current);
  }

  return {
    status: publicLevel(freshServers),
    online,
    lastUpdatedAt: latest?.toISOString() ?? null,
    groups: [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, group]) => ({
      key,
      label: groupLabel(key),
      status: publicLevel(group.fresh),
      online: group.online,
      activeServers: group.fresh,
      totalServers: group.total
    }))
  };
}

function isValidRow(value: unknown): value is PublicMinecraftServerRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.server_id === "string" && typeof row.group_key === "string" && Number.isFinite(Number(row.online_players)) && Number.isFinite(new Date(row.last_seen_at as string | Date).getTime());
}

export async function readPublicMinecraftStatus(db: Pick<Pool, "query"> = getPool(), now = new Date()): Promise<PublicMinecraftStatus | null> {
  try {
    const [rows] = await db.query(
      "SELECT server_id,group_key,online_players,last_seen_at FROM minecraft_servers ORDER BY group_key,server_id"
    ) as [unknown[], unknown];
    if (!Array.isArray(rows)) return null;
    const validRows = rows.filter(isValidRow);
    if (validRows.length !== rows.length) return null;
    return aggregateMinecraftServers(validRows, now);
  } catch {
    return null;
  }
}
