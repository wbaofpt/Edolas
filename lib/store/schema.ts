import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

type StoreSchemaDb = Pick<Pool, "query" | "execute">;

export const STORE_GROUP_SEEDS = [
  { key: "op-skyblock", name: "OP Skyblock", sortOrder: 0 },
  { key: "survival", name: "Survival", sortOrder: 10 },
  { key: "fantasy-skyblock", name: "Fantasy Skyblock", sortOrder: 20 },
  { key: "smp", name: "SMP", sortOrder: 30 },
] as const;

export const STORE_CATEGORY_SEEDS = [
  { groupKey: "survival", slug: "ranks", name: "Rank", sortOrder: 10 },
  { groupKey: "survival", slug: "items", name: "Vật phẩm", sortOrder: 20 },
  { groupKey: "survival", slug: "utilities", name: "Tiện ích", sortOrder: 30 },
  { groupKey: "fantasy-skyblock", slug: "ranks", name: "Rank", sortOrder: 10 },
  { groupKey: "fantasy-skyblock", slug: "crates", name: "Crate", sortOrder: 20 },
  { groupKey: "fantasy-skyblock", slug: "battle-pass", name: "Battle Pass", sortOrder: 30 },
  { groupKey: "smp", slug: "ranks", name: "Rank", sortOrder: 10 },
  { groupKey: "smp", slug: "cosmetics", name: "Mỹ phẩm", sortOrder: 20 },
  { groupKey: "smp", slug: "bundles", name: "Combo", sortOrder: 30 },
] as const;

export const CREATE_STORE_GROUPS_SQL = `CREATE TABLE IF NOT EXISTS store_groups (
  group_key VARCHAR(40) NOT NULL, display_name VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (group_key), KEY store_group_catalog_index (is_active,sort_order),
  CONSTRAINT store_group_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT store_group_updater_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
)`;

export const CREATE_STORE_CATEGORIES_SQL = `CREATE TABLE IF NOT EXISTS store_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, group_key VARCHAR(40) NOT NULL, slug VARCHAR(50) NOT NULL, name VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY store_category_group_slug_unique (group_key,slug), KEY store_category_catalog_index (group_key,is_active,sort_order),
  CONSTRAINT store_category_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT store_category_updater_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
)`;

export const CREATE_STORE_PACKAGES_SQL = `CREATE TABLE IF NOT EXISTS store_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, slug VARCHAR(50) NOT NULL, name VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL, group_key VARCHAR(40) NOT NULL, category_id BIGINT UNSIGNED NULL,
  image_path VARCHAR(255) NULL, badge VARCHAR(20) NULL, is_featured BOOLEAN NOT NULL DEFAULT FALSE, price_vnd INT UNSIGNED NOT NULL,
  command_template VARCHAR(512) NOT NULL, accent ENUM('cyan','violet','sapphire','ice') NOT NULL DEFAULT 'cyan',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY store_package_slug_unique (slug), KEY store_package_catalog_index (group_key,is_active,sort_order),
  KEY store_package_category_index (category_id,is_active,sort_order),
  CONSTRAINT store_package_category_fk FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE SET NULL,
  CONSTRAINT store_package_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT store_package_updater_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
)`;

export const CREATE_STORE_ORDERS_SQL = `CREATE TABLE IF NOT EXISTS store_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, reference CHAR(14) NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
  client_request_key VARCHAR(80) NULL,
  package_id BIGINT UNSIGNED NULL, package_name VARCHAR(80) NOT NULL, package_slug VARCHAR(50) NOT NULL,
  command_template_snapshot VARCHAR(512) NOT NULL,
  price_vnd INT UNSIGNED NOT NULL, group_key VARCHAR(40) NOT NULL, minecraft_username VARCHAR(16) NOT NULL,
  payment_method ENUM('momo','bank') NOT NULL,
  status ENUM('pending_payment','approved','delivering','fulfilled','failed','needs_review','cancelled') NOT NULL DEFAULT 'pending_payment',
  approved_by BIGINT UNSIGNED NULL, approved_at DATETIME(3) NULL, fulfilled_at DATETIME(3) NULL, failure_message VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY store_order_reference_unique (reference), UNIQUE KEY store_order_user_request_unique (user_id,client_request_key), KEY store_order_user_index (user_id,created_at), KEY store_order_queue_index (status,group_key,created_at),
  CONSTRAINT store_order_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT store_order_package_fk FOREIGN KEY (package_id) REFERENCES store_packages(id) ON DELETE SET NULL,
  CONSTRAINT store_order_approver_fk FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
)`;

export const CREATE_STORE_DELIVERIES_SQL = `CREATE TABLE IF NOT EXISTS store_command_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, order_id BIGINT UNSIGNED NOT NULL, group_key VARCHAR(40) NOT NULL,
  command_text VARCHAR(512) NOT NULL, status ENUM('pending','claimed','succeeded','failed','needs_review') NOT NULL DEFAULT 'pending',
  claimed_by_server VARCHAR(40) NULL, claim_token_hash CHAR(64) NULL, claimed_at DATETIME(3) NULL, completed_at DATETIME(3) NULL,
  output_summary VARCHAR(500) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY store_delivery_order_unique (order_id), KEY store_delivery_claim_index (group_key,status,id),
  CONSTRAINT store_delivery_order_fk FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE RESTRICT,
  CONSTRAINT store_delivery_server_fk FOREIGN KEY (claimed_by_server) REFERENCES minecraft_servers(server_id) ON DELETE SET NULL
)`;

export const CREATE_STORE_PAYMENT_ATTEMPTS_SQL = `CREATE TABLE IF NOT EXISTS store_payment_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, order_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('sandbox','payos','momo') NOT NULL, provider_order_id VARCHAR(100) NOT NULL,
  status ENUM('creating','awaiting_payment','paid','expired','cancelled','failed','simulated') NOT NULL DEFAULT 'creating',
  amount_vnd INT UNSIGNED NOT NULL, checkout_url VARCHAR(1000) NULL, qr_content TEXT NULL,
  provider_transaction_id VARCHAR(120) NULL, sandbox_token_hash CHAR(64) NULL,
  account_username_snapshot VARCHAR(40) NOT NULL, account_email_snapshot VARCHAR(254) NOT NULL,
  minecraft_username_snapshot VARCHAR(16) NOT NULL, expires_at DATETIME(3) NULL, paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY store_payment_provider_order_unique (provider,provider_order_id),
  KEY store_payment_order_status_index (order_id,status), KEY store_payment_expiry_index (status,expires_at),
  CONSTRAINT store_payment_attempt_order_fk FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE RESTRICT
)`;

export const CREATE_STORE_PAYMENT_EVENTS_SQL = `CREATE TABLE IF NOT EXISTS store_payment_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, attempt_id BIGINT UNSIGNED NULL,
  provider ENUM('sandbox','payos','momo') NOT NULL, event_key CHAR(64) NOT NULL, event_type VARCHAR(50) NOT NULL,
  signature_valid BOOLEAN NOT NULL, provider_transaction_id VARCHAR(120) NULL, amount_vnd INT UNSIGNED NULL,
  outcome ENUM('accepted','duplicate','rejected','ignored','error') NOT NULL,
  payload_json JSON NOT NULL, received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), processed_at DATETIME(3) NULL,
  PRIMARY KEY (id), UNIQUE KEY store_payment_event_unique (provider,event_key), KEY store_payment_event_attempt_index (attempt_id,received_at),
  CONSTRAINT store_payment_event_attempt_fk FOREIGN KEY (attempt_id) REFERENCES store_payment_attempts(id) ON DELETE SET NULL
)`;

export async function applyStoreMigration(db: StoreSchemaDb = getPool()) {
  await db.execute(CREATE_STORE_GROUPS_SQL);
  await db.execute(CREATE_STORE_CATEGORIES_SQL);
  await db.execute(CREATE_STORE_PACKAGES_SQL);
  await db.execute(`INSERT INTO store_groups (group_key,display_name,sort_order,is_active)
    SELECT known.group_key,COALESCE(NULLIF(MAX(ms.display_name),''),known.group_key),0,TRUE
    FROM (
      SELECT group_key FROM minecraft_servers
      UNION
      SELECT group_key FROM store_packages
    ) known
    LEFT JOIN minecraft_servers ms ON ms.group_key=known.group_key
    GROUP BY known.group_key
    ON DUPLICATE KEY UPDATE group_key=VALUES(group_key)`);
  for (const group of STORE_GROUP_SEEDS) {
    await db.execute(
      "INSERT IGNORE INTO store_groups (group_key,display_name,sort_order,is_active) VALUES (?,?,?,TRUE)",
      [group.key, group.name, group.sortOrder],
    );
  }
  const [categoryColumns] = (await db.query(
    "SELECT COLUMN_NAME,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_categories'",
  )) as [Array<{ COLUMN_NAME: string; IS_NULLABLE: string }>, unknown];
  const categoryGroupColumn = categoryColumns.find((row) => row.COLUMN_NAME === "group_key");
  if (!categoryGroupColumn) {
    await db.execute("ALTER TABLE store_categories ADD COLUMN group_key VARCHAR(40) NULL AFTER id");
  }
  const [mixedCategories] = (await db.query(`SELECT c.id,COUNT(DISTINCT p.group_key) group_count,
      SUM(p.group_key<>c.group_key) mismatch_count
    FROM store_categories c JOIN store_packages p ON p.category_id=c.id
    GROUP BY c.id,c.group_key
    HAVING COUNT(DISTINCT p.group_key)>1
      OR (c.group_key IS NOT NULL AND SUM(p.group_key<>c.group_key)>0)`)) as [Array<{ id: number }>, unknown];
  if (mixedCategories.length > 0) {
    throw new Error("Store migration cannot assign a legacy category used by multiple groups.");
  }
  await db.execute(`UPDATE store_categories c
    JOIN (SELECT category_id,MIN(group_key) group_key FROM store_packages WHERE category_id IS NOT NULL GROUP BY category_id) p
      ON p.category_id=c.id
    SET c.group_key=p.group_key
    WHERE c.group_key IS NULL`);
  await db.execute(`UPDATE store_categories c
    SET c.group_key=(SELECT group_key FROM store_groups ORDER BY sort_order,group_key LIMIT 1)
    WHERE c.group_key IS NULL`);
  const [unassignedCategories] = (await db.query(
    "SELECT id FROM store_categories WHERE group_key IS NULL LIMIT 1",
  )) as [Array<{ id: number }>, unknown];
  if (unassignedCategories.length > 0) {
    throw new Error("Store migration cannot assign a category because no Store group exists.");
  }
  if (!categoryGroupColumn || categoryGroupColumn.IS_NULLABLE === "YES") {
    await db.execute("ALTER TABLE store_categories MODIFY group_key VARCHAR(40) NOT NULL");
  }
  const [categoryIndexes] = (await db.query(
    "SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_categories' ORDER BY INDEX_NAME,SEQ_IN_INDEX",
  )) as [Array<{ INDEX_NAME: string; COLUMN_NAME: string; SEQ_IN_INDEX: number }>, unknown];
  const indexColumns = (name: string) => categoryIndexes
    .filter((row) => row.INDEX_NAME === name)
    .map((row) => row.COLUMN_NAME)
    .join(",");
  if (!indexColumns("store_category_group_slug_unique")) {
    await db.execute("ALTER TABLE store_categories ADD UNIQUE KEY store_category_group_slug_unique (group_key,slug)");
  }
  if (indexColumns("store_category_slug_unique")) {
    await db.execute("ALTER TABLE store_categories DROP INDEX store_category_slug_unique");
  }
  if (indexColumns("store_category_catalog_index") !== "group_key,is_active,sort_order") {
    if (indexColumns("store_category_catalog_index")) {
      await db.execute("ALTER TABLE store_categories DROP INDEX store_category_catalog_index");
    }
    await db.execute("ALTER TABLE store_categories ADD KEY store_category_catalog_index (group_key,is_active,sort_order)");
  }
  for (const category of STORE_CATEGORY_SEEDS) {
    await db.execute(
      "INSERT IGNORE INTO store_categories (group_key,slug,name,sort_order,is_active) VALUES (?,?,?,?,TRUE)",
      [category.groupKey, category.slug, category.name, category.sortOrder],
    );
  }
  const [packageColumns] = (await db.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_packages'",
  )) as [Array<{ COLUMN_NAME: string }>, unknown];
  const existingPackageColumns = new Set(packageColumns.map((row) => row.COLUMN_NAME));
  const packageColumnMigrations = [
    ["category_id", "ALTER TABLE store_packages ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER group_key"],
    ["image_path", "ALTER TABLE store_packages ADD COLUMN image_path VARCHAR(255) NULL AFTER category_id"],
    ["badge", "ALTER TABLE store_packages ADD COLUMN badge VARCHAR(20) NULL AFTER image_path"],
    ["is_featured", "ALTER TABLE store_packages ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE AFTER badge"],
  ] as const;
  for (const [column, sql] of packageColumnMigrations) {
    if (!existingPackageColumns.has(column)) await db.execute(sql);
  }
  const [packageIndexes] = (await db.query(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_packages' AND INDEX_NAME='store_package_category_index'",
  )) as [Array<{ INDEX_NAME: string }>, unknown];
  if (packageIndexes.length === 0) {
    await db.execute("ALTER TABLE store_packages ADD KEY store_package_category_index (category_id,is_active,sort_order)");
  }
  const [packageConstraints] = (await db.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_packages' AND CONSTRAINT_NAME='store_package_category_fk'",
  )) as [Array<{ CONSTRAINT_NAME: string }>, unknown];
  if (packageConstraints.length === 0) {
    await db.execute("ALTER TABLE store_packages ADD CONSTRAINT store_package_category_fk FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE SET NULL");
  }
  await db.execute(CREATE_STORE_ORDERS_SQL);
  const [columns] = (await db.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_orders'",
  )) as [Array<{ COLUMN_NAME: string }>, unknown];
  if (!columns.some((row) => row.COLUMN_NAME === "command_template_snapshot")) {
    await db.execute(
      "ALTER TABLE store_orders ADD COLUMN command_template_snapshot VARCHAR(512) NULL AFTER package_slug",
    );
  }
  if (!columns.some((row) => row.COLUMN_NAME === "client_request_key")) {
    await db.execute("ALTER TABLE store_orders ADD COLUMN client_request_key VARCHAR(80) NULL AFTER user_id");
  }
  const [orderRequestIndexes] = (await db.query(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_orders' AND INDEX_NAME='store_order_user_request_unique'",
  )) as [Array<{ INDEX_NAME: string }>, unknown];
  if (orderRequestIndexes.length === 0) {
    await db.execute("ALTER TABLE store_orders ADD UNIQUE KEY store_order_user_request_unique (user_id,client_request_key)");
  }
  await db.execute(`UPDATE store_orders o
    JOIN store_packages p ON p.id=o.package_id
    SET o.command_template_snapshot=p.command_template
    WHERE o.command_template_snapshot IS NULL`);
  await db.execute(CREATE_STORE_DELIVERIES_SQL);
  await db.execute(CREATE_STORE_PAYMENT_ATTEMPTS_SQL);
  await db.execute(CREATE_STORE_PAYMENT_EVENTS_SQL);
}
