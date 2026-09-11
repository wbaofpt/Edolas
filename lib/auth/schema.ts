import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

type ColumnRow = { COLUMN_NAME: string };
type IndexRow = { INDEX_NAME: string; NON_UNIQUE: number; columns_csv: string | null };

const CREATE_AUTH_SESSIONS_SQL = `
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
  )
`;

function normalizeIndexColumns(columnsCsv: string | null) {
  return columnsCsv?.replace(/\s+/g, "").toLowerCase() ?? "";
}

async function hasTable(pool: Pool, tableName: string) {
  const [rows] = (await pool.query(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1
    `,
    [tableName]
  )) as [Array<{ TABLE_NAME: string }>, unknown];

  return rows.length > 0;
}

async function listColumns(pool: Pool, tableName: string) {
  const [rows] = (await pool.query(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  )) as [ColumnRow[], unknown];

  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function listIndexes(pool: Pool, tableName: string) {
  const [rows] = (await pool.query(
    `
      SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_csv
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      GROUP BY INDEX_NAME, NON_UNIQUE
    `,
    [tableName]
  )) as [IndexRow[], unknown];

  return rows;
}

async function hasSingleColumnIndex(pool: Pool, tableName: string, columnName: string, unique: boolean) {
  const rows = await listIndexes(pool, tableName);
  return rows.some((row) => row.NON_UNIQUE === (unique ? 0 : 1) && normalizeIndexColumns(row.columns_csv) === columnName.toLowerCase());
}

async function ensureUsersAuthColumns(pool: Pool) {
  const existingColumns = await listColumns(pool, "users");
  const columnStatements: Array<[string, string]> = [
    ["email", "ALTER TABLE users ADD COLUMN email VARCHAR(190) NULL"],
    ["password_hash", "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL"],
    ["referral_code", "ALTER TABLE users ADD COLUMN referral_code VARCHAR(50) NULL"],
    ["email_verified_at", "ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL"],
    ["remember_login", "ALTER TABLE users ADD COLUMN remember_login BOOLEAN NULL DEFAULT NULL"]
  ];

  for (const [columnName, statement] of columnStatements) {
    if (!existingColumns.has(columnName)) {
      await pool.execute(statement);
      existingColumns.add(columnName);
    }
  }

  const hasEmailUniqueIndex = await hasSingleColumnIndex(pool, "users", "email", true);
  if (!hasEmailUniqueIndex) {
    const [duplicateRows] = (await pool.query(
      `
        SELECT LOWER(email) AS normalized_email, COUNT(*) AS duplicate_count
        FROM users
        WHERE email IS NOT NULL
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      `
    )) as [Array<{ normalized_email: string; duplicate_count: number }>, unknown];

    if (duplicateRows.length > 0) {
      throw new Error("Cannot create the unique users.email index because duplicate emails already exist.");
    }

    await pool.execute("CREATE UNIQUE INDEX users_email_unique ON users (email)");
  }
}

async function ensureAuthSessionsTable(pool: Pool) {
  if (!(await hasTable(pool, "auth_sessions"))) {
    await pool.execute(CREATE_AUTH_SESSIONS_SQL);
  }

  const existingColumns = await listColumns(pool, "auth_sessions");
  if (!existingColumns.has("id")) {
    throw new Error("auth_sessions exists without an id column. Recreate the table with the canonical migration.");
  }

  const columnStatements: Array<[string, string]> = [
    ["user_id", "ALTER TABLE auth_sessions ADD COLUMN user_id BIGINT UNSIGNED NOT NULL"],
    ["token_hash", "ALTER TABLE auth_sessions ADD COLUMN token_hash CHAR(64) NOT NULL"],
    ["expires_at", "ALTER TABLE auth_sessions ADD COLUMN expires_at TIMESTAMP NOT NULL"],
    ["created_at", "ALTER TABLE auth_sessions ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["last_used_at", "ALTER TABLE auth_sessions ADD COLUMN last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"]
  ];

  for (const [columnName, statement] of columnStatements) {
    if (!existingColumns.has(columnName)) {
      await pool.execute(statement);
      existingColumns.add(columnName);
    }
  }

  const hasTokenUniqueIndex = await hasSingleColumnIndex(pool, "auth_sessions", "token_hash", true);
  if (!hasTokenUniqueIndex) {
    const [duplicateRows] = (await pool.query(
      `
        SELECT COUNT(*) AS duplicate_count
        FROM (
          SELECT token_hash
          FROM auth_sessions
          GROUP BY token_hash
          HAVING COUNT(*) > 1
        ) AS duplicates
      `
    )) as [Array<{ duplicate_count: number }>, unknown];

    if (duplicateRows[0]?.duplicate_count > 0) {
      throw new Error("Cannot create the unique auth_sessions.token_hash index because duplicate token hashes already exist.");
    }

    await pool.execute("CREATE UNIQUE INDEX auth_sessions_token_hash_unique ON auth_sessions (token_hash)");
  }

  const hasUserIndex = await hasSingleColumnIndex(pool, "auth_sessions", "user_id", false);
  if (!hasUserIndex) {
    await pool.execute("CREATE INDEX auth_sessions_user_id_index ON auth_sessions (user_id)");
  }

  const hasExpiryIndex = await hasSingleColumnIndex(pool, "auth_sessions", "expires_at", false);
  if (!hasExpiryIndex) {
    await pool.execute("CREATE INDEX auth_sessions_expires_at_index ON auth_sessions (expires_at)");
  }
}

export async function applyAuthMigration(pool: Pool = getPool()) {
  await ensureUsersAuthColumns(pool);
  await ensureAuthSessionsTable(pool);
}

export type AuthSchemaSnapshot = {
  database: string;
  usersColumns: string[];
  authSessionsExists: boolean;
  usersEmailUniqueIndex: boolean;
  authSessionsTokenUniqueIndex: boolean;
  authSessionsUserIndex: boolean;
  authSessionsExpiryIndex: boolean;
};

export async function collectAuthSchemaSnapshot(pool: Pool = getPool()): Promise<AuthSchemaSnapshot> {
  const [databaseRows] = (await pool.query("SELECT DATABASE() AS database_name")) as [Array<{ database_name: string }>, unknown];
  const usersColumns = await listColumns(pool, "users");
  const authSessionsExists = await hasTable(pool, "auth_sessions");
  const usersEmailUniqueIndex = await hasSingleColumnIndex(pool, "users", "email", true);
  const authSessionsTokenUniqueIndex = authSessionsExists ? await hasSingleColumnIndex(pool, "auth_sessions", "token_hash", true) : false;
  const authSessionsUserIndex = authSessionsExists ? await hasSingleColumnIndex(pool, "auth_sessions", "user_id", false) : false;
  const authSessionsExpiryIndex = authSessionsExists ? await hasSingleColumnIndex(pool, "auth_sessions", "expires_at", false) : false;

  return {
    database: databaseRows[0]?.database_name ?? "",
    usersColumns: Array.from(usersColumns).sort(),
    authSessionsExists,
    usersEmailUniqueIndex,
    authSessionsTokenUniqueIndex,
    authSessionsUserIndex,
    authSessionsExpiryIndex
  };
}
