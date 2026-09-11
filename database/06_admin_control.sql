USE edolas_db;

-- Use scripts/migrate-admin-control.mts for replay-safe application to an existing database.
ALTER TABLE users
  ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER role_name,
  ADD COLUMN locked_at TIMESTAMP NULL AFTER account_status,
  ADD COLUMN locked_by BIGINT UNSIGNED NULL AFTER locked_at,
  ADD COLUMN lock_reason VARCHAR(300) NULL AFTER locked_by,
  ADD COLUMN disabled_until TIMESTAMP NULL AFTER lock_reason,
  ADD COLUMN disabled_forever BOOLEAN NOT NULL DEFAULT FALSE AFTER disabled_until,
  ADD COLUMN disabled_by BIGINT UNSIGNED NULL AFTER disabled_forever,
  ADD COLUMN disabled_reason VARCHAR(300) NULL AFTER disabled_by;

UPDATE users SET role_name = 'admin' WHERE role_name = 'owner' AND username <> 'edolas_admin';
UPDATE users SET role_name = 'owner', account_status = 'active', locked_at = NULL, locked_by = NULL, lock_reason = NULL, disabled_until = NULL, disabled_forever = FALSE, disabled_by = NULL, disabled_reason = NULL WHERE username = 'edolas_admin';

ALTER TABLE users
  ADD COLUMN owner_slot TINYINT GENERATED ALWAYS AS (CASE WHEN role_name = 'owner' THEN 1 ELSE NULL END) STORED,
  ADD UNIQUE KEY users_owner_slot_unique (owner_slot);

ALTER TABLE announcements ADD COLUMN deleted_at TIMESTAMP NULL, ADD COLUMN deleted_by BIGINT UNSIGNED NULL, ADD COLUMN purge_after TIMESTAMP NULL;
ALTER TABLE game_modes ADD COLUMN deleted_at TIMESTAMP NULL, ADD COLUMN deleted_by BIGINT UNSIGNED NULL, ADD COLUMN purge_after TIMESTAMP NULL;
ALTER TABLE game_modes ADD COLUMN banner_path VARCHAR(255) NULL AFTER status;
ALTER TABLE game_modes ADD COLUMN tags_json JSON NULL AFTER banner_path;
UPDATE game_modes SET tags_json=JSON_ARRAY('PE/PC', name) WHERE tags_json IS NULL OR JSON_LENGTH(tags_json)=0;
ALTER TABLE forum_topics ADD COLUMN deleted_at TIMESTAMP NULL, ADD COLUMN deleted_by BIGINT UNSIGNED NULL, ADD COLUMN purge_after TIMESTAMP NULL;
ALTER TABLE wiki_pages ADD COLUMN deleted_at TIMESTAMP NULL, ADD COLUMN deleted_by BIGINT UNSIGNED NULL, ADD COLUMN purge_after TIMESTAMP NULL;
ALTER TABLE wiki_media ADD COLUMN deleted_at TIMESTAMP NULL, ADD COLUMN deleted_by BIGINT UNSIGNED NULL, ADD COLUMN purge_after TIMESTAMP NULL;
ALTER TABLE rules ADD COLUMN deleted_at TIMESTAMP NULL, ADD COLUMN deleted_by BIGINT UNSIGNED NULL, ADD COLUMN purge_after TIMESTAMP NULL;
ALTER TABLE server_stats ADD COLUMN deleted_at TIMESTAMP NULL, ADD COLUMN deleted_by BIGINT UNSIGNED NULL, ADD COLUMN purge_after TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  setting_group VARCHAR(40) NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY site_settings_group_index (setting_group),
  CONSTRAINT site_settings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO site_settings (setting_key, setting_value, setting_group, is_public)
SELECT 'bedrock_ip', COALESCE((SELECT setting_value FROM site_settings WHERE setting_key = 'server_ip'), 'play.edolassg.vn'), 'connection', TRUE
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE setting_key = 'bedrock_ip');

INSERT INTO site_settings (setting_key, setting_value, setting_group, is_public)
VALUES ('bedrock_port', '19132', 'connection', TRUE)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(80) NULL,
  summary VARCHAR(300) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY admin_audit_actor_index (actor_id),
  KEY admin_audit_created_index (created_at),
  KEY admin_audit_target_index (target_type, target_id),
  CONSTRAINT admin_audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
