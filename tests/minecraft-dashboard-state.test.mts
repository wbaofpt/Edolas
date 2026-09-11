import test from "node:test";
import assert from "node:assert/strict";
import { isCurrentMinecraftPoll, removeMinecraftGroupFromStatus } from "../lib/minecraft/dashboard-state.ts";

const status = {
  network: { status: "online", online: 3, lastUpdatedAt: "2026-08-14T12:00:00Z", groups: [
    { key: "survival", label: "Survival", status: "online", online: 3, activeServers: 1, totalServers: 1 },
    { key: "old", label: "Old", status: "offline", online: 0, activeServers: 0, totalServers: 1 }
  ] },
  groups: [
    { key: "survival", label: "Survival", mapped: true, status: "online", online: 3, activeServers: 1, totalServers: 1, servers: [] },
    { key: "old", label: "Old", mapped: false, status: "offline", online: 0, activeServers: 0, totalServers: 1, servers: [] }
  ],
  servers: [{ id: "old-01", group: "old" }, { id: "survival-01", group: "survival" }]
} as never;

test("dashboard removes a deleted group from every local status projection", () => {
  const updated = removeMinecraftGroupFromStatus(status, "old");
  assert.deepEqual(updated.network.groups.map((group) => group.key), ["survival"]);
  assert.deepEqual(updated.groups.map((group) => group.key), ["survival"]);
  assert.deepEqual(updated.servers.map((server) => server.id), ["survival-01"]);
});

test("dashboard ignores polling responses started before or during a mutation", () => {
  assert.equal(isCurrentMinecraftPoll(4, 4), true);
  assert.equal(isCurrentMinecraftPoll(4, 5), false);
});
