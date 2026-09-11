import test from "node:test";
import assert from "node:assert/strict";
import { hashControlSecret } from "../lib/control/session.ts";
import { consumePasswordReset, requestPasswordResetByAdmin, resolvePasswordResetAppUrl } from "../lib/auth/password-reset.ts";

const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

test("admin password reset stores only a token hash and emails the account owner", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  let delivered = "";
  const result = await requestPasswordResetByAdmin(admin, 7, {
    db: {
      query: async () => [[{ id: 7, username: "player", email: "player@example.com", role_name: "player" }], undefined] as const,
      execute: async (sql: string, values: unknown[]) => { statements.push({ sql, values }); return [{ affectedRows: 1 }, undefined] as const; }
    } as never,
    makeToken: () => "raw-reset-token",
    sendEmail: async ({ to, url }) => { delivered = `${to}|${url}`; },
    appUrl: "https://edolas.vn",
    now: new Date("2026-08-12T12:00:00Z")
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(delivered, "player@example.com|https://edolas.vn/reset-password?token=raw-reset-token");
  const insert = statements.find((entry) => entry.sql.includes("INSERT INTO password_reset_tokens"));
  assert.equal(insert?.values.includes("raw-reset-token"), false);
  assert.equal(insert?.values.includes(hashControlSecret("raw-reset-token")), true);
});

test("password reset token is single-use and revokes every session", async () => {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query(_sql: string, values: unknown[]) { assert.equal(values[0], hashControlSecret("raw-reset-token")); return [[{ id: 3, user_id: 7, expires_at: new Date("2026-08-12T12:30:00Z"), consumed_at: null }], undefined] as const; },
    async execute(sql: string) {
      if (sql.includes("UPDATE users")) calls.push("password");
      else if (sql.includes("password_reset_tokens")) calls.push("consume");
      else if (sql.includes("auth_sessions")) calls.push("auth");
      else if (sql.includes("control_sessions")) calls.push("control");
      return [{ affectedRows: 1 }, undefined] as const;
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  const result = await consumePasswordReset("raw-reset-token", "NewSecure#123", { db: { getConnection: async () => connection } as never, now: new Date("2026-08-12T12:05:00Z") });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, ["begin", "password", "consume", "auth", "control", "commit", "release"]);
});

test("password reset rejects weak or expired submissions", async () => {
  assert.deepEqual(await consumePasswordReset("token", "123", { db: null as never }), { ok: false, status: 400, error: "Mật khẩu mới phải có ít nhất 8 ký tự." });
  const connection = { async beginTransaction() {}, async query() { return [[{ id: 3, user_id: 7, expires_at: new Date("2026-08-12T12:00:00Z"), consumed_at: null }], undefined] as const; }, async execute() { return [{ affectedRows: 1 }, undefined] as const; }, async commit() {}, async rollback() {}, release() {} };
  assert.deepEqual(await consumePasswordReset("token", "NewSecure#123", { db: { getConnection: async () => connection } as never, now: new Date("2026-08-12T12:00:01Z") }), { ok: false, status: 400, error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
});

test("password reset URL fails closed in production without a public APP_URL", () => {
  assert.equal(resolvePasswordResetAppUrl(undefined, { NODE_ENV: "production" }), null);
  assert.equal(resolvePasswordResetAppUrl(undefined, { NODE_ENV: "development" }), "http://localhost:3000");
  assert.equal(resolvePasswordResetAppUrl("https://edolas.vn/", { NODE_ENV: "production" }), "https://edolas.vn");
});
