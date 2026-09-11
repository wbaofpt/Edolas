import type { ControlMinecraftStatus } from "./control-status.ts";

export function removeMinecraftGroupFromStatus(status: ControlMinecraftStatus, groupKey: string): ControlMinecraftStatus {
  return {
    ...status,
    network: {
      ...status.network,
      groups: status.network.groups.filter((group) => group.key !== groupKey)
    },
    groups: status.groups.filter((group) => group.key !== groupKey),
    servers: status.servers.filter((server) => server.group !== groupKey)
  };
}

export function isCurrentMinecraftPoll(startGeneration: number, currentGeneration: number) {
  return startGeneration === currentGeneration;
}
