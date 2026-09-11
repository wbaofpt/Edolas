import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

type TelemetrySchemaDb = Pick<Pool, "execute">;

export const CREATE_MINECRAFT_SERVERS_SQL = `CREATE TABLE IF NOT EXISTS minecraft_servers (
  server_id VARCHAR(40) NOT NULL,
  group_key VARCHAR(40) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  minecraft_version VARCHAR(40) NOT NULL,
  paper_version VARCHAR(120) NOT NULL,
  online_players INT UNSIGNED NOT NULL DEFAULT 0,
  max_players INT UNSIGNED NOT NULL DEFAULT 0,
  tps_1m DECIMAL(6,3) NOT NULL DEFAULT 0,
  tps_5m DECIMAL(6,3) NOT NULL DEFAULT 0,
  tps_15m DECIMAL(6,3) NOT NULL DEFAULT 0,
  mspt DECIMAL(10,3) NOT NULL DEFAULT 0,
  memory_used_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  memory_max_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  uptime_seconds BIGINT UNSIGNED NOT NULL DEFAULT 0,
  worlds_json JSON NOT NULL,
  plugin_health_json JSON NOT NULL,
  reported_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (server_id),
  KEY minecraft_servers_group_index (group_key),
  KEY minecraft_servers_seen_index (last_seen_at)
)`;

export const CREATE_MINECRAFT_PLAYERS_SQL = `CREATE TABLE IF NOT EXISTS minecraft_online_players (
  server_id VARCHAR(40) NOT NULL,
  player_uuid CHAR(36) NOT NULL,
  username VARCHAR(16) NOT NULL,
  ping INT UNSIGNED NOT NULL DEFAULT 0,
  world_name VARCHAR(64) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  PRIMARY KEY (server_id, player_uuid),
  KEY minecraft_players_username_index (username),
  KEY minecraft_players_observed_index (observed_at),
  CONSTRAINT minecraft_players_server_fk FOREIGN KEY (server_id) REFERENCES minecraft_servers(server_id) ON DELETE CASCADE
)`;

export const CREATE_MINECRAFT_NONCES_SQL = `CREATE TABLE IF NOT EXISTS minecraft_telemetry_nonces (
  server_id VARCHAR(40) NOT NULL,
  nonce_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  PRIMARY KEY (server_id, nonce_hash),
  KEY minecraft_nonces_expiry_index (expires_at)
)`;

export async function applyMinecraftTelemetryMigration(db: TelemetrySchemaDb = getPool()) {
  await db.execute(CREATE_MINECRAFT_SERVERS_SQL);
  await db.execute(CREATE_MINECRAFT_PLAYERS_SQL);
  await db.execute(CREATE_MINECRAFT_NONCES_SQL);
}
