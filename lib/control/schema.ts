import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

type ControlSchemaDb = Pick<Pool, "query" | "execute">;

export const CREATE_CONTROL_CHALLENGES_SQL = `CREATE TABLE IF NOT EXISTS control_auth_challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  challenge_hash CHAR(64) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY control_challenge_hash_unique (challenge_hash),
  UNIQUE KEY control_challenge_user_unique (user_id),
  KEY control_challenge_expiry_index (expires_at),
  CONSTRAINT control_challenge_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

export const CREATE_CONTROL_ACCESS_LIMITS_SQL = `CREATE TABLE IF NOT EXISTS control_access_limits (
  user_id BIGINT UNSIGNED NOT NULL,
  failed_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT control_access_limit_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

export const CREATE_CONTROL_SESSIONS_SQL = `CREATE TABLE IF NOT EXISTS control_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY control_session_token_unique (token_hash),
  KEY control_session_user_index (user_id),
  KEY control_session_expiry_index (expires_at, last_used_at),
  CONSTRAINT control_session_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

export const CREATE_PASSWORD_RESETS_SQL = `CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  requested_by BIGINT UNSIGNED NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY password_reset_token_unique (token_hash),
  KEY password_reset_user_index (user_id, created_at),
  CONSTRAINT password_reset_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT password_reset_actor_fk FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
)`;

export async function applyControlMigration(db: ControlSchemaDb = getPool()) {
  await db.execute(CREATE_CONTROL_CHALLENGES_SQL);
  await db.execute(CREATE_CONTROL_ACCESS_LIMITS_SQL);
  await db.execute(CREATE_CONTROL_SESSIONS_SQL);
  await db.execute(CREATE_PASSWORD_RESETS_SQL);
  const [indexes] = await db.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='control_auth_challenges' AND INDEX_NAME IN ('control_challenge_user_unique','control_challenge_user_index')") as [Array<{ INDEX_NAME: string }>, unknown];
  const names = new Set(indexes.map((index) => index.INDEX_NAME));
  if (!names.has("control_challenge_user_unique")) {
    await db.execute("DELETE older FROM control_auth_challenges older INNER JOIN control_auth_challenges newer ON newer.user_id=older.user_id AND newer.id>older.id");
    await db.execute(`ALTER TABLE control_auth_challenges ${names.has("control_challenge_user_index") ? "DROP INDEX control_challenge_user_index, " : ""}ADD UNIQUE KEY control_challenge_user_unique (user_id)`);
  }
}
