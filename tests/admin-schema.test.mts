import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyAdminMigration } from "../lib/admin/schema.ts";

test("admin SQL defines account safety, trash, settings and immutable audit storage", async () => {
  const sql = await readFile(new URL("../database/06_admin_control.sql", import.meta.url), "utf8");
  assert.match(sql, /account_status VARCHAR\(20\).*DEFAULT 'active'/i);
  assert.match(sql, /disabled_until TIMESTAMP NULL/i);
  assert.match(sql, /disabled_forever BOOLEAN.*DEFAULT FALSE/i);
  assert.match(sql, /owner_slot.*GENERATED ALWAYS/i);
  assert.match(sql, /UNIQUE.*owner_slot/i);
  assert.match(sql, /deleted_at TIMESTAMP NULL/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS site_settings/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS admin_audit_logs/i);
  assert.match(sql, /purge_after/i);
  assert.match(sql, /username = 'edolas_admin'/i);
  assert.match(sql, /game_modes ADD COLUMN banner_path VARCHAR\(255\)/i);
  assert.match(sql, /game_modes ADD COLUMN tags_json JSON/i);
  assert.match(sql, /bedrock_ip/i);
  assert.match(sql, /bedrock_port.*19132/i);
});

test("admin migration only adds missing columns and always reconciles owner and tables", async () => {
  const statements: string[] = [];
  const existing: Record<string, string[]> = {
    users: ["id", "account_status", "locked_at", "locked_by", "lock_reason", "disabled_until", "disabled_forever", "disabled_by", "disabled_reason", "owner_slot"],
    forum_topics: ["id", "deleted_at", "deleted_by", "purge_after"],
    wiki_pages: ["id", "deleted_at", "deleted_by", "purge_after"],
    wiki_media: ["id", "deleted_at", "deleted_by", "purge_after"]
  };
  await applyAdminMigration({
    async query(_sql: string, params: unknown[]) {
      const table = String(params[0]);
      return [(existing[table] ?? ["id"]).map((COLUMN_NAME) => ({ COLUMN_NAME })), undefined] as const;
    },
    async execute(sql: string) {
      statements.push(sql.replace(/\s+/g, " ").trim());
      return [{ affectedRows: 0 }, undefined] as const;
    }
  } as never);

  assert.equal(statements.some((sql) => /ADD COLUMN account_status/i.test(sql)), false);
  assert.equal(statements.some((sql) => /UPDATE users SET role_name = 'admin'/i.test(sql)), true);
  assert.equal(statements.some((sql) => /CREATE TABLE IF NOT EXISTS site_settings/i.test(sql)), true);
  assert.equal(statements.some((sql) => /CREATE TABLE IF NOT EXISTS admin_audit_logs/i.test(sql)), true);
  assert.equal(statements.some((sql) => /ALTER TABLE game_modes ADD COLUMN banner_path VARCHAR\(255\)/i.test(sql)), true);
  assert.equal(statements.some((sql) => /ALTER TABLE game_modes ADD COLUMN tags_json JSON/i.test(sql)), true);
  assert.equal(statements.some((sql) => /bedrock_ip/i.test(sql)), true);
  assert.equal(statements.some((sql) => /bedrock_port/i.test(sql)), true);
});
