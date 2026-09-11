import type { ControlMinecraftPlayer, ControlMinecraftStatus } from "./control-status.ts";

export type MinecraftPingFilter = "all" | "excellent" | "good" | "slow";

export type MinecraftPlayerDirectoryEntry = ControlMinecraftPlayer & {
  groupKey: string;
  groupLabel: string;
  serverId: string;
  serverLabel: string;
};

export type MinecraftPlayerFilters = {
  query: string;
  group: string;
  server: string;
  world: string;
  ping: MinecraftPingFilter;
};

export function buildMinecraftPlayerDirectory(status: ControlMinecraftStatus | null): MinecraftPlayerDirectoryEntry[] {
  if (!status) return [];
  return status.groups.flatMap((group) => group.servers.flatMap((server) => server.players.map((player) => ({
    ...player,
    groupKey: group.key,
    groupLabel: group.label,
    serverId: server.id,
    serverLabel: server.displayName
  }))));
}

function matchesPing(ping: number, filter: MinecraftPingFilter) {
  if (filter === "excellent") return ping <= 50;
  if (filter === "good") return ping > 50 && ping <= 100;
  if (filter === "slow") return ping > 100;
  return true;
}

export function filterMinecraftPlayers(players: MinecraftPlayerDirectoryEntry[], filters: MinecraftPlayerFilters) {
  const query = filters.query.trim().toLocaleLowerCase("vi");
  return players.filter((player) => {
    if (filters.group && player.groupKey !== filters.group) return false;
    if (filters.server && player.serverId !== filters.server) return false;
    if (filters.world && player.world !== filters.world) return false;
    if (!matchesPing(player.ping, filters.ping)) return false;
    if (!query) return true;
    return [player.username, player.uuid, player.groupKey, player.groupLabel, player.serverId, player.serverLabel, player.world]
      .some((value) => value.toLocaleLowerCase("vi").includes(query));
  });
}

export function buildMinecraftPlayerFilterOptions(players: MinecraftPlayerDirectoryEntry[], groupKey = "") {
  const groups = new Map<string, string>();
  const servers = new Map<string, string>();
  const worlds = new Set<string>();
  for (const player of players) {
    groups.set(player.groupKey, player.groupLabel);
    if (!groupKey || player.groupKey === groupKey) servers.set(player.serverId, player.serverLabel);
    worlds.add(player.world);
  }
  const byLabel = (left: { label: string }, right: { label: string }) => left.label.localeCompare(right.label);
  return {
    groups: [...groups].map(([value, label]) => ({ value, label })).sort(byLabel),
    servers: [...servers].map(([value, label]) => ({ value, label })).sort(byLabel),
    worlds: [...worlds].sort((left, right) => left.localeCompare(right))
  };
}

export function formatMinecraftLocation(groupLabel: string, serverLabel: string) {
  return groupLabel.trim().localeCompare(serverLabel.trim(), undefined, { sensitivity: "accent" }) === 0
    ? groupLabel
    : `${groupLabel} / ${serverLabel}`;
}
