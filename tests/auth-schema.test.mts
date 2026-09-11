import test from "node:test";
import assert from "node:assert/strict";
import { getPool } from "../lib/db.ts";

test("live schema exposes the auth columns and auth_sessions table", async (t) => {
  const pool = getPool();
  t.after(async () => {
    await pool.end();
  });

  const [userColumns] = await pool.query<Array<{ COLUMN_NAME: string }>>(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('email', 'password_hash', 'referral_code', 'email_verified_at', 'remember_login')
      ORDER BY COLUMN_NAME
    `
  );

  const [sessionTable] = await pool.query<Array<{ TABLE_NAME: string }>>(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'auth_sessions'
    `
  );

  assert.deepEqual(
    userColumns.map((column) => column.COLUMN_NAME),
    ["email", "email_verified_at", "password_hash", "referral_code", "remember_login"]
  );
  assert.equal(sessionTable.length, 1);
});
