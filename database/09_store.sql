USE edolas_db;

CREATE TABLE IF NOT EXISTS store_groups (
  group_key VARCHAR(40) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (group_key),
  KEY store_group_catalog_index (is_active, sort_order),
  CONSTRAINT store_group_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT store_group_updater_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO store_groups (group_key, display_name, sort_order, is_active) VALUES
  ('op-skyblock', 'OP Skyblock', 0, TRUE),
  ('survival', 'Survival', 10, TRUE),
  ('fantasy-skyblock', 'Fantasy Skyblock', 20, TRUE),
  ('smp', 'SMP', 30, TRUE);

CREATE TABLE IF NOT EXISTS store_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_key VARCHAR(40) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  name VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY store_category_group_slug_unique (group_key, slug),
  KEY store_category_catalog_index (group_key, is_active, sort_order),
  CONSTRAINT store_category_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT store_category_updater_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO store_categories (group_key, slug, name, sort_order, is_active) VALUES
  ('survival', 'ranks', 'Rank', 10, TRUE),
  ('survival', 'items', 'Vật phẩm', 20, TRUE),
  ('survival', 'utilities', 'Tiện ích', 30, TRUE),
  ('fantasy-skyblock', 'ranks', 'Rank', 10, TRUE),
  ('fantasy-skyblock', 'crates', 'Crate', 20, TRUE),
  ('fantasy-skyblock', 'battle-pass', 'Battle Pass', 30, TRUE),
  ('smp', 'ranks', 'Rank', 10, TRUE),
  ('smp', 'cosmetics', 'Mỹ phẩm', 20, TRUE),
  ('smp', 'bundles', 'Combo', 30, TRUE);

CREATE TABLE IF NOT EXISTS store_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(50) NOT NULL,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL,
  group_key VARCHAR(40) NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  image_path VARCHAR(255) NULL,
  badge VARCHAR(20) NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  price_vnd INT UNSIGNED NOT NULL,
  command_template VARCHAR(512) NOT NULL,
  accent ENUM('cyan','violet','sapphire','ice') NOT NULL DEFAULT 'cyan',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY store_package_slug_unique (slug),
  KEY store_package_catalog_index (group_key, is_active, sort_order),
  KEY store_package_category_index (category_id, is_active, sort_order),
  CONSTRAINT store_package_category_fk FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE SET NULL,
  CONSTRAINT store_package_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT store_package_updater_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference CHAR(14) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  client_request_key VARCHAR(80) NULL,
  package_id BIGINT UNSIGNED NULL,
  package_name VARCHAR(80) NOT NULL,
  package_slug VARCHAR(50) NOT NULL,
  command_template_snapshot VARCHAR(512) NOT NULL,
  price_vnd INT UNSIGNED NOT NULL,
  group_key VARCHAR(40) NOT NULL,
  minecraft_username VARCHAR(16) NOT NULL,
  payment_method ENUM('momo','bank') NOT NULL,
  status ENUM('pending_payment','approved','delivering','fulfilled','failed','needs_review','cancelled') NOT NULL DEFAULT 'pending_payment',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME(3) NULL,
  fulfilled_at DATETIME(3) NULL,
  failure_message VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY store_order_reference_unique (reference),
  UNIQUE KEY store_order_user_request_unique (user_id, client_request_key),
  KEY store_order_user_index (user_id, created_at),
  KEY store_order_queue_index (status, group_key, created_at),
  CONSTRAINT store_order_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT store_order_package_fk FOREIGN KEY (package_id) REFERENCES store_packages(id) ON DELETE SET NULL,
  CONSTRAINT store_order_approver_fk FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store_command_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  group_key VARCHAR(40) NOT NULL,
  command_text VARCHAR(512) NOT NULL,
  status ENUM('pending','claimed','succeeded','failed','needs_review') NOT NULL DEFAULT 'pending',
  claimed_by_server VARCHAR(40) NULL,
  claim_token_hash CHAR(64) NULL,
  claimed_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  output_summary VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY store_delivery_order_unique (order_id),
  KEY store_delivery_claim_index (group_key, status, id),
  CONSTRAINT store_delivery_order_fk FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE RESTRICT,
  CONSTRAINT store_delivery_server_fk FOREIGN KEY (claimed_by_server) REFERENCES minecraft_servers(server_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store_payment_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('sandbox','payos','momo') NOT NULL,
  provider_order_id VARCHAR(100) NOT NULL,
  status ENUM('creating','awaiting_payment','paid','expired','cancelled','failed','simulated') NOT NULL DEFAULT 'creating',
  amount_vnd INT UNSIGNED NOT NULL,
  checkout_url VARCHAR(1000) NULL,
  qr_content TEXT NULL,
  provider_transaction_id VARCHAR(120) NULL,
  sandbox_token_hash CHAR(64) NULL,
  account_username_snapshot VARCHAR(40) NOT NULL,
  account_email_snapshot VARCHAR(254) NOT NULL,
  minecraft_username_snapshot VARCHAR(16) NOT NULL,
  expires_at DATETIME(3) NULL,
  paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY store_payment_provider_order_unique (provider, provider_order_id),
  KEY store_payment_order_status_index (order_id, status),
  KEY store_payment_expiry_index (status, expires_at),
  CONSTRAINT store_payment_attempt_order_fk FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS store_payment_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id BIGINT UNSIGNED NULL,
  provider ENUM('sandbox','payos','momo') NOT NULL,
  event_key CHAR(64) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  provider_transaction_id VARCHAR(120) NULL,
  amount_vnd INT UNSIGNED NULL,
  outcome ENUM('accepted','duplicate','rejected','ignored','error') NOT NULL,
  payload_json JSON NOT NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY store_payment_event_unique (provider, event_key),
  KEY store_payment_event_attempt_index (attempt_id, received_at),
  CONSTRAINT store_payment_event_attempt_fk FOREIGN KEY (attempt_id) REFERENCES store_payment_attempts(id) ON DELETE SET NULL
);
