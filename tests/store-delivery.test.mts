import test from "node:test";
import assert from "node:assert/strict";
import { claimStoreDelivery } from "../lib/store/delivery.ts";

test("delivery claim is restricted to the provisioned cluster", async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined,
    execute: async () => [{ affectedRows: 1 }, undefined],
    query: async (sql: string, values: unknown[]) => {
      queries.push({ sql, values });
      if (sql.includes("FROM minecraft_servers")) {
        return [[{ group_key: "survival" }], undefined];
      }
      return [
        [{ id: 7, order_id: 8, command_text: "say delivered" }],
        undefined,
      ];
    },
  };
  const result = await claimStoreDelivery(
    {
      serverId: "survival-01",
      expectedGroup: "survival",
      nonce: "nonce-1234567890abcdef",
      now: new Date("2026-08-14T10:00:00Z"),
    },
    { getConnection: async () => connection } as never,
  );
  assert.equal(result?.command, "say delivered");
  assert.equal(queries[0].values[1], "survival");
  assert.equal(queries[1].values[0], "survival");
});
