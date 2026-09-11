import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMinecraftPlayerDirectory,
  buildMinecraftPlayerFilterOptions,
  filterMinecraftPlayers,
  formatMinecraftLocation
} from "../lib/minecraft/player-directory.ts";

const status = {
  groups: [
    { key: "survival", label: "Survival", servers: [
      { id: "survival-01", displayName: "Survival 01", players: [
        { uuid: "a", username: "Bao", ping: 35, world: "world", observedAt: "2026-08-14T00:00:00Z" },
        { uuid: "b", username: "Alex", ping: 75, world: "resource", observedAt: "2026-08-14T00:00:00Z" }
      ] }
    ] },
    { key: "op-skyblock", label: "OP Skyblock", servers: [
      { id: "op-skyblock", displayName: "OP Skyblock", players: [
        { uuid: "c", username: "QuocBaooo", ping: 130, world: "skyblock", observedAt: "2026-08-14T00:00:00Z" }
      ] }
    ] }
  ]
} as never;

test("player directory flattens telemetry with stable cluster and backend identities", () => {
  const players = buildMinecraftPlayerDirectory(status);
  assert.deepEqual(players.map((player) => [player.username, player.groupKey, player.serverId]), [
    ["Bao", "survival", "survival-01"],
    ["Alex", "survival", "survival-01"],
    ["QuocBaooo", "op-skyblock", "op-skyblock"]
  ]);
});

test("player directory composes search, cluster, backend, world and ping filters", () => {
  const players = buildMinecraftPlayerDirectory(status);
  assert.deepEqual(filterMinecraftPlayers(players, { query: "quoc", group: "", server: "", world: "", ping: "all" }).map((player) => player.username), ["QuocBaooo"]);
  assert.deepEqual(filterMinecraftPlayers(players, { query: "", group: "survival", server: "survival-01", world: "resource", ping: "good" }).map((player) => player.username), ["Alex"]);
  assert.deepEqual(filterMinecraftPlayers(players, { query: "", group: "", server: "", world: "", ping: "excellent" }).map((player) => player.username), ["Bao"]);
  assert.deepEqual(filterMinecraftPlayers(players, { query: "", group: "", server: "", world: "", ping: "slow" }).map((player) => player.username), ["QuocBaooo"]);
});

test("player filter options narrow backends by cluster and remain deterministic", () => {
  const players = buildMinecraftPlayerDirectory(status);
  assert.deepEqual(buildMinecraftPlayerFilterOptions(players, "survival"), {
    groups: [{ value: "op-skyblock", label: "OP Skyblock" }, { value: "survival", label: "Survival" }],
    servers: [{ value: "survival-01", label: "Survival 01" }],
    worlds: ["resource", "skyblock", "world"]
  });
});

test("Minecraft locations omit repeated cluster and backend labels", () => {
  assert.equal(formatMinecraftLocation("OP Skyblock", "OP Skyblock"), "OP Skyblock");
  assert.equal(formatMinecraftLocation("Survival", "Survival 01"), "Survival / Survival 01");
});
