import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "../lib/auth/password.ts";
import { beginControlAccess, verifyControlOtp } from "../lib/control/access.ts";

const user = { id: 2, username: "admin", display_name: "Admin", role_name: "admin", email: "admin@edolas.vn", password_hash: hashPassword("Secure#Password2026"), account_status: "active" };

test("control access requires an authorized active account with email and correct password", async () => {
  const db = { query: async () => [[user], undefined] as const, execute: async () => [{ affectedRows: 1 }, undefined] as const };
  assert.equal((await beginControlAccess(2, "wrong", { db: db as never, sendEmail: async () => {} })).status, 401);
  const noEmail = { ...user, email: null };
  assert.equal((await beginControlAccess(2, "Secure#Password2026", { db: { ...db, query: async () => [[noEmail], undefined] as const } as never, sendEmail: async () => {} })).status, 409);
  const player = { ...user, role_name: "player" };
  assert.equal((await beginControlAccess(2, "Secure#Password2026", { db: { ...db, query: async () => [[player], undefined] as const } as never, sendEmail: async () => {} })).status, 403);
});

test("control access stores a hashed challenge and sends OTP only to the account email", async () => {
  let insertValues: unknown[] = []; let delivered = "";
  const result = await beginControlAccess(2, "Secure#Password2026", {
    db: { query: async (sql: string) => [sql.startsWith("SELECT challenge_hash") ? [{ challenge_hash: String(insertValues[1]) }] : sql.includes("control_auth_challenges") ? [] : [user], undefined] as const, execute: async (sql: string, values: unknown[]) => { if (sql.startsWith("INSERT INTO control_auth_challenges")) insertValues = values; return [{ affectedRows: 1 }, undefined] as const; } } as never,
    sendEmail: async ({ to }) => { delivered = to; },
    makeCode: () => "123456",
    now: new Date("2026-08-12T12:00:00Z")
  });
  assert.equal(result.ok, true);
  assert.equal(delivered, "admin@edolas.vn");
  assert.equal(insertValues.includes("123456"), false);
  assert.match(String(insertValues[1]), /^[a-f0-9]{64}$/);
});

test("control access blocks password verification after repeated failures", async () => {
  const db = {
    query: async (sql: string) => {
      if (sql.includes("control_access_limits")) return [[{ failed_attempts: 5, window_started_at: new Date("2026-08-12T11:55:00Z"), blocked_until: new Date("2026-08-12T12:10:00Z") }], undefined] as const;
      return [[user], undefined] as const;
    },
    execute: async () => [{ affectedRows: 1 }, undefined] as const
  };
  const result = await beginControlAccess(2, "Secure#Password2026", { db: db as never, sendEmail: async () => {}, now: new Date("2026-08-12T12:00:00Z") });
  assert.deepEqual(result, { ok: false, status: 429, error: "Quá nhiều lần thử. Vui lòng thử lại sau." });
});

test("control access converts a concurrent challenge collision into cooldown", async () => {
  const db = {
    query: async (sql: string) => [sql.includes("FROM users") ? [user] : [], undefined] as const,
    execute: async (sql: string) => {
      if (sql.startsWith("INSERT INTO control_auth_challenges")) throw Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" });
      return [{ affectedRows: 1 }, undefined] as const;
    }
  };
  const result = await beginControlAccess(2, "Secure#Password2026", { db: db as never, sendEmail: async () => {}, makeCode: () => "123456", now: new Date("2026-08-12T12:00:00Z") });
  assert.deepEqual(result, { ok: false, status: 429, error: "Vui lòng chờ 60 giây trước khi yêu cầu mã mới." });
});

test("control access verifies challenge ownership when mysql2 reports a duplicate no-op as affected", async () => {
  const db = {
    query: async (sql: string) => {
      if (sql.startsWith("SELECT challenge_hash")) return [[{ challenge_hash: "another-request-won" }], undefined] as const;
      return [sql.includes("FROM users") ? [user] : [], undefined] as const;
    },
    execute: async () => [{ affectedRows: 1 }, undefined] as const
  };
  const result = await beginControlAccess(2, "Secure#Password2026", { db: db as never, sendEmail: async () => {}, makeCode: () => "123456", now: new Date("2026-08-12T12:00:00Z") });
  assert.deepEqual(result, { ok: false, status: 429, error: "Vui lòng chờ 60 giây trước khi yêu cầu mã mới." });
});

test("control access removes the challenge when Gmail delivery fails", async () => {
  const statements: string[] = [];
  let savedHash = "";
  const result = await beginControlAccess(2, "Secure#Password2026", {
    db: {
      query: async (sql: string) => [sql.startsWith("SELECT challenge_hash") ? [{ challenge_hash: savedHash }] : sql.includes("control_auth_challenges") ? [] : [user], undefined] as const,
      execute: async (sql: string, values?: unknown[]) => { statements.push(sql); if (sql.startsWith("INSERT INTO control_auth_challenges")) savedHash = String(values?.[1]); return [{ affectedRows: 1 }, undefined] as const; }
    } as never,
    sendEmail: async () => { throw new Error("SMTP unavailable"); },
    makeCode: () => "123456",
    now: new Date("2026-08-12T12:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(statements.some((sql) => sql.startsWith("DELETE FROM control_auth_challenges")), true);
});

test("OTP verification creates a separate control session and rejects the sixth attempt", async () => {
  const challenge = { id: 4, user_id: 2, code_hash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", attempts: 0, expires_at: new Date("2026-08-12T12:10:00Z"), consumed_at: null, role_name: "admin", account_status: "active" };
  const calls: string[] = [];
  const connection = {
    async beginTransaction(){calls.push("begin");},
    async query(){return [[challenge],undefined] as const;},
    async execute(sql:string){calls.push(sql.includes("control_sessions")?"session":sql.includes("attempts")?"attempt":"consume");return [{affectedRows:1},undefined] as const;},
    async commit(){calls.push("commit");}, async rollback(){calls.push("rollback");}, release(){calls.push("release");}
  };
  const result = await verifyControlOtp("challenge-token", "123456", { db: { getConnection: async()=>connection } as never, now: new Date("2026-08-12T12:05:00Z") });
  assert.equal(result.ok, true);
  assert.deepEqual(calls,["begin","consume","session","commit","release"]);

  const blocked = { ...challenge, attempts: 5 };
  const blockedConnection = { ...connection, query: async()=>[[blocked],undefined] as const };
  const denied = await verifyControlOtp("challenge-token", "123456", { db:{getConnection:async()=>blockedConnection} as never, now:new Date("2026-08-12T12:05:00Z") });
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 429);
});
