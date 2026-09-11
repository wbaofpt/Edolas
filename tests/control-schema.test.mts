import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyControlMigration } from "../lib/control/schema.ts";

test("secure control SQL defines challenges, sessions and password resets without raw secrets", async () => {
  const sql = await readFile(new URL("../database/07_secure_control.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS control_auth_challenges/i);
  assert.match(sql, /challenge_hash CHAR\(64\)/i);
  assert.match(sql, /code_hash CHAR\(64\)/i);
  assert.match(sql, /attempts TINYINT UNSIGNED/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS control_sessions/i);
  assert.match(sql, /csrf_hash CHAR\(64\)/i);
  assert.match(sql, /last_used_at TIMESTAMP/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS password_reset_tokens/i);
  assert.doesNotMatch(sql, /raw_token|raw_code|password_plain/i);
});

test("secure control schema serializes OTP requests and persists password rate limits", async () => {
  const source = await readFile(new URL("../lib/control/schema.ts", import.meta.url), "utf8");
  assert.match(source, /UNIQUE KEY control_challenge_user_unique \(user_id\)/);
  assert.match(source, /control_access_limits/);
  assert.match(source, /failed_attempts/);
  assert.match(source, /blocked_until/);
});

test("control migration is replay safe", async () => {
  const statements: string[] = [];
  await applyControlMigration({ query: async () => [[{ INDEX_NAME: "control_challenge_user_unique" }], undefined] as const, execute: async (sql: string) => { statements.push(sql); return [{ affectedRows: 0 }, undefined] as const; } } as never);
  assert.equal(statements.length, 4);
  assert.equal(statements.every((sql) => /CREATE TABLE IF NOT EXISTS/i.test(sql)), true);
});
