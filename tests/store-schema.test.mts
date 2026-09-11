import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("store migration defines packages, immutable orders and unique command deliveries", async () => {
  const sql = await readFile(new URL("../database/09_store.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS store_groups/);
  assert.match(sql, /display_name VARCHAR\(80\) NOT NULL/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS store_categories/);
  assert.match(sql, /group_key VARCHAR\(40\) NOT NULL/);
  assert.match(sql, /UNIQUE KEY store_category_group_slug_unique \(group_key, slug\)/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS store_packages/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS store_orders/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS store_command_deliveries/);
  assert.match(sql, /command_template_snapshot VARCHAR\(512\) NOT NULL/);
  assert.match(sql, /UNIQUE KEY store_delivery_order_unique \(order_id\)/);
  assert.match(sql, /claim_token_hash CHAR\(64\)/);
  assert.match(sql, /category_id BIGINT UNSIGNED NULL/);
  assert.match(sql, /image_path VARCHAR\(255\) NULL/);
  assert.match(sql, /badge VARCHAR\(20\) NULL/);
  assert.match(sql, /is_featured BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(sql, /store_package_category_fk/);
});

test("store migration reconciles catalog columns for existing databases", async () => {
  const source = await readFile(new URL("../lib/store/schema.ts", import.meta.url), "utf8");
  assert.match(source, /CREATE_STORE_GROUPS_SQL/);
  assert.match(source, /CREATE_STORE_CATEGORIES_SQL/);
  assert.match(source, /TABLE_NAME='store_categories'/);
  assert.match(source, /ADD COLUMN group_key VARCHAR\(40\) NULL/);
  assert.match(source, /store_category_group_slug_unique/);
  assert.match(source, /COUNT\(DISTINCT p\.group_key\)/);
  assert.match(source, /SUM\(p\.group_key<>c\.group_key\)/);
  assert.match(source, /GROUP BY c\.id,c\.group_key/);
  assert.doesNotMatch(
    source,
    /FROM store_categories c JOIN store_packages p ON p\.category_id=c\.id\s+WHERE c\.group_key IS NULL/,
  );
  assert.match(source, /TABLE_NAME='store_packages'/);
  assert.match(source, /ADD COLUMN category_id/);
  assert.match(source, /ADD COLUMN image_path/);
  assert.match(source, /ADD COLUMN badge/);
  assert.match(source, /ADD COLUMN is_featured/);
  assert.match(source, /store_package_category_index/);
  assert.match(
    source,
    /if \(!columns\.some[\s\S]+?ADD COLUMN command_template_snapshot[\s\S]+?\}\s*await db\.execute\(`UPDATE store_orders/,
  );
});

test("store migration runner and package script remain replayable", async () => {
  const script = await readFile(new URL("../scripts/migrate-store.mts", import.meta.url), "utf8");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(script, /applyStoreMigration/);
  assert.match(pkg.scripts["db:migrate:store"], /migrate-store/);
});
