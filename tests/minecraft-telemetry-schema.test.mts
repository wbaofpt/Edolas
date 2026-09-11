import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMinecraftTelemetryMigration,
  CREATE_MINECRAFT_NONCES_SQL,
  CREATE_MINECRAFT_PLAYERS_SQL,
  CREATE_MINECRAFT_SERVERS_SQL
} from "../lib/minecraft/schema.ts";

test("telemetry migration creates server, player and nonce tables in dependency order", async () => {
  const statements: string[] = [];
  const db = {
    execute: async (sql: string) => {
      statements.push(sql);
      return [{ affectedRows: 0 }, undefined] as const;
    }
  };

  await applyMinecraftTelemetryMigration(db as never);

  assert.deepEqual(statements, [
    CREATE_MINECRAFT_SERVERS_SQL,
    CREATE_MINECRAFT_PLAYERS_SQL,
    CREATE_MINECRAFT_NONCES_SQL
  ]);
  assert.match(CREATE_MINECRAFT_SERVERS_SQL, /CREATE TABLE IF NOT EXISTS minecraft_servers/);
  assert.match(CREATE_MINECRAFT_PLAYERS_SQL, /FOREIGN KEY \(server_id\).*ON DELETE CASCADE/s);
  assert.match(CREATE_MINECRAFT_NONCES_SQL, /PRIMARY KEY \(server_id, nonce_hash\)/);
});
