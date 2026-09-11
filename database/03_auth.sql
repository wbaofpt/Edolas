USE edolas_db;

-- Use scripts/apply-auth-migration.mts for idempotent application on an existing database.
ALTER TABLE users
  ADD COLUMN email VARCHAR(190) NULL,
  ADD COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN referral_code VARCHAR(50) NULL,
  ADD COLUMN email_verified_at TIMESTAMP NULL,
  ADD COLUMN remember_login BOOLEAN NULL DEFAULT NULL;

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY auth_sessions_token_hash_unique (token_hash),
  KEY auth_sessions_user_id_index (user_id),
  KEY auth_sessions_expires_at_index (expires_at),
  CONSTRAINT auth_sessions_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX auth_sessions_token_hash_unique ON auth_sessions (token_hash);
CREATE INDEX auth_sessions_user_id_index ON auth_sessions (user_id);
CREATE INDEX auth_sessions_expires_at_index ON auth_sessions (expires_at);
