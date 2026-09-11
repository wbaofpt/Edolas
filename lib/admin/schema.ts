import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

type SchemaDb = Pick<Pool, "query" | "execute">;
type ColumnRow = { COLUMN_NAME: string };

const TRASH_TABLES = ["announcements", "game_modes", "forum_topics", "wiki_pages", "wiki_media", "rules", "server_stats"] as const;

async function listColumns(db: SchemaDb, table: string) {
  const [rows] = await db.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table]
  ) as [ColumnRow[], unknown];
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function addMissingColumns(
  db: SchemaDb,
  table: string,
  additions: Array<[name: string, definition: string]>
) {
  const columns = await listColumns(db, table);
  for (const [name, definition] of additions) {
    if (!columns.has(name)) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

export async function applyAdminMigration(db: SchemaDb = getPool()) {
  await addMissingColumns(db, "users", [
    ["account_status", "account_status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER role_name"],
    ["locked_at", "locked_at TIMESTAMP NULL AFTER account_status"],
    ["locked_by", "locked_by BIGINT UNSIGNED NULL AFTER locked_at"],
    ["lock_reason", "lock_reason VARCHAR(300) NULL AFTER locked_by"],
    ["disabled_until", "disabled_until TIMESTAMP NULL AFTER lock_reason"],
    ["disabled_forever", "disabled_forever BOOLEAN NOT NULL DEFAULT FALSE AFTER disabled_until"],
    ["disabled_by", "disabled_by BIGINT UNSIGNED NULL AFTER disabled_forever"],
    ["disabled_reason", "disabled_reason VARCHAR(300) NULL AFTER disabled_by"]
  ]);

  // Reconcile legacy roles before creating the database-level unique Owner guard.
  await db.execute("UPDATE users SET role_name = 'admin' WHERE role_name = 'owner' AND username <> 'edolas_admin'");
  await db.execute("UPDATE users SET role_name = 'owner', account_status = 'active', locked_at = NULL, locked_by = NULL, lock_reason = NULL, disabled_until = NULL, disabled_forever = FALSE, disabled_by = NULL, disabled_reason = NULL WHERE username = 'edolas_admin'");

  const userColumns = await listColumns(db, "users");
  if (!userColumns.has("owner_slot")) {
    await db.execute("ALTER TABLE users ADD COLUMN owner_slot TINYINT GENERATED ALWAYS AS (CASE WHEN role_name = 'owner' THEN 1 ELSE NULL END) STORED, ADD UNIQUE KEY users_owner_slot_unique (owner_slot)");
  }

  await addMissingColumns(db, "game_modes", [
    ["banner_path", "banner_path VARCHAR(255) NULL AFTER status"],
    ["tags_json", "tags_json JSON NULL AFTER banner_path"]
  ]);

  await db.execute("UPDATE game_modes SET tags_json=JSON_ARRAY('PE/PC', name) WHERE tags_json IS NULL OR JSON_LENGTH(tags_json)=0");

  for (const table of TRASH_TABLES) {
    await addMissingColumns(db, table, [
      ["deleted_at", "deleted_at TIMESTAMP NULL"],
      ["deleted_by", "deleted_by BIGINT UNSIGNED NULL"],
      ["purge_after", "purge_after TIMESTAMP NULL"]
    ]);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(80) NOT NULL,
      setting_value TEXT NOT NULL,
      setting_group VARCHAR(40) NOT NULL DEFAULT 'general',
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (setting_key),
      KEY site_settings_group_index (setting_group),
      CONSTRAINT site_settings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      actor_id BIGINT UNSIGNED NULL,
      action VARCHAR(80) NOT NULL,
      target_type VARCHAR(40) NOT NULL,
      target_id VARCHAR(80) NULL,
      summary VARCHAR(300) NOT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY admin_audit_actor_index (actor_id),
      KEY admin_audit_created_index (created_at),
      KEY admin_audit_target_index (target_type, target_id),
      CONSTRAINT admin_audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db.execute(`
    INSERT INTO site_settings (setting_key, setting_value, setting_group, is_public)
    VALUES
      ('server_name', 'EdolasSG', 'brand', TRUE),
      ('server_ip', 'play.edolassg.vn', 'connection', TRUE),
      ('discord_url', 'https://discord.gg/edolassg', 'community', TRUE),
      ('maintenance_mode', 'false', 'system', TRUE)
    ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key)
  `);

  await db.execute(`
    INSERT INTO site_settings (setting_key, setting_value, setting_group, is_public)
    SELECT 'bedrock_ip', COALESCE((SELECT setting_value FROM site_settings WHERE setting_key = 'server_ip'), 'play.edolassg.vn'), 'connection', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE setting_key = 'bedrock_ip')
  `);

  await db.execute(`
    INSERT INTO site_settings (setting_key, setting_value, setting_group, is_public)
    VALUES ('bedrock_port', '19132', 'connection', TRUE)
    ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key)
  `);
}

export async function collectAdminSchemaSnapshot(db: SchemaDb = getPool()) {
  const users = await listColumns(db, "users");
  const forumTopics = await listColumns(db, "forum_topics");
  const wikiPages = await listColumns(db, "wiki_pages");
  const wikiMedia = await listColumns(db, "wiki_media");
  return {
    users: Array.from(users).sort(),
    forumTopics: Array.from(forumTopics).sort(),
    wikiPages: Array.from(wikiPages).sort(),
    wikiMedia: Array.from(wikiMedia).sort()
  };
}
