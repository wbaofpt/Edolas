import test from "node:test";
import assert from "node:assert/strict";
import { getUserBySession, loginUser, registerUser } from "../lib/auth/service.ts";

function makeRegisterDb(calls: string[]) {
  const connection = {
    async beginTransaction() {
      calls.push("begin");
    },
    async execute(sql: string) {
      if (sql.includes("INSERT INTO users")) {
        calls.push("insert-user");
        return [{ insertId: 42 }, undefined] as const;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    async query() {
      return [[{ id: 42, username: "stormarchitect", display_name: "Storm Architect", role_name: "player", avatar_url: null }], undefined] as const;
    },
    async commit() {
      calls.push("commit");
    },
    async rollback() {
      calls.push("rollback");
    },
    release() {
      calls.push("release");
    }
  };

  return {
    async getConnection() {
      return connection;
    }
  };
}

function makeLoginDb(userRows: Array<{ id: number; username: string; display_name: string; role_name: string; avatar_url: string | null; password_hash: string; account_status?: "active" | "locked" | "disabled"; disabled_until?: Date | null; disabled_forever?: boolean }>, calls: string[]) {
  const connection = {
    async beginTransaction() {
      calls.push("begin");
    },
    async execute(sql: string) {
      if (sql.includes("INSERT INTO auth_sessions")) {
        calls.push("insert-session");
        return [{ insertId: 11 }, undefined] as const;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    async query(sql: string) {
      if (sql.includes("FROM users")) {
        calls.push("lookup-user");
        return [userRows, undefined] as const;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    async commit() {
      calls.push("commit");
    },
    async rollback() {
      calls.push("rollback");
    },
    release() {
      calls.push("release");
    }
  };

  return {
    async getConnection() {
      return connection;
    }
  };
}

test("registerUser creates an account without creating a session", async () => {
  const calls: string[] = [];
  const fakeDb = makeRegisterDb(calls);

  const result = await registerUser(
    {
      displayName: "Storm Architect",
      username: "stormarchitect",
      email: "storm@example.com",
      password: "Seismic#123",
      referralCode: null
    },
    {
      db: fakeDb,
      now: new Date("2026-08-11T00:00:00Z"),
      verification: {
        isEmailVerified: () => true,
        consumeVerification: (email: string) => calls.push(`consume:${email}`)
      }
    }
  );

  assert.equal(result.ok, true);
  assert.equal("session" in result, false);
  assert.deepEqual(calls, ["begin", "insert-user", "commit", "consume:storm@example.com", "release"]);
});

test("registerUser rejects a duplicate email without consuming verification", async () => {
  const calls: string[] = [];
  const duplicateError = Object.assign(new Error("Duplicate entry for users_email_unique"), {
    code: "ER_DUP_ENTRY"
  });
  const db = {
    async getConnection() {
      return {
        async beginTransaction() { calls.push("begin"); },
        async execute() { throw duplicateError; },
        async commit() { calls.push("commit"); },
        async rollback() { calls.push("rollback"); },
        release() { calls.push("release"); }
      };
    }
  };

  const result = await registerUser(
    {
      displayName: "Second Account",
      username: "SecondAccount",
      email: "storm@example.com",
      password: "Seismic#123",
      referralCode: null
    },
    {
      db,
      verification: {
        isEmailVerified: () => true,
        consumeVerification: () => calls.push("consume")
      }
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.deepEqual(calls, ["begin", "rollback", "release"]);
});

test("getUserBySession returns the user attached to a valid unexpired session", async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    async getConnection() {
      return {
        async query(sql: string, values: unknown[]) {
          calls.push({ sql, values });
          return [[{
            id: 42,
            username: "storm_architect",
            display_name: "Storm Architect",
            role_name: "player",
            avatar_url: "/avatars/storm.png",
            password_hash: null
          }], undefined] as const;
        },
        release() {}
      };
    }
  };

  const user = await getUserBySession("raw-session-token", {
    db,
    now: new Date("2026-08-11T00:00:00Z")
  });

  assert.deepEqual(user, {
    id: 42,
    username: "storm_architect",
    displayName: "Storm Architect",
    roleName: "player",
    avatarUrl: "/avatars/storm.png"
  });
  assert.match(calls[0]?.sql ?? "", /FROM auth_sessions s/);
  assert.deepEqual(calls[0]?.values[1], new Date("2026-08-11T00:00:00Z"));
  assert.notEqual(calls[0]?.values[0], "raw-session-token");
});

test("loginUser returns the same 401 for unknown users and wrong passwords", async () => {
  const unknownCalls: string[] = [];
  const wrongPasswordCalls: string[] = [];

  const unknownUserResult = await loginUser(
    { identifier: "missing@example.com", password: "Seismic#123", remember: false },
    {
      db: makeLoginDb([], unknownCalls),
      now: new Date("2026-08-11T00:00:00Z")
    }
  );

  const wrongPasswordResult = await loginUser(
    {
      identifier: "storm_architect",
      password: "wrong-password",
      remember: false
    },
    {
      db: makeLoginDb([
        {
          id: 42,
          username: "storm_architect",
          display_name: "Storm Architect",
          role_name: "player",
          avatar_url: null,
          password_hash: "ffffffffffffffffffffffffffffffff:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
        }
      ], wrongPasswordCalls),
      now: new Date("2026-08-11T00:00:00Z")
    }
  );

  assert.equal(unknownUserResult.ok, false);
  assert.equal(unknownUserResult.status, 401);
  assert.equal(unknownUserResult.error, "Thông tin đăng nhập không hợp lệ.");
  assert.equal(wrongPasswordResult.ok, false);
  assert.equal(wrongPasswordResult.status, 401);
  assert.equal(wrongPasswordResult.error, "Thông tin đăng nhập không hợp lệ.");
  assert.deepEqual(unknownCalls, ["lookup-user", "release"]);
  assert.deepEqual(wrongPasswordCalls, ["lookup-user", "release"]);
});

test("loginUser rejects a locked account before creating a session", async () => {
  const calls: string[] = [];
  const result = await loginUser(
    { identifier: "storm_architect", password: "Seismic#123", remember: false },
    {
      db: makeLoginDb([{
        id: 42,
        username: "storm_architect",
        display_name: "Storm Architect",
        role_name: "player",
        avatar_url: null,
        password_hash: "unused-by-locked-account",
        account_status: "locked"
      }], calls),
      now: new Date("2026-08-11T00:00:00Z")
    }
  );

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    error: "Tài khoản đã bị khóa. Vui lòng liên hệ ban quản trị."
  });
  assert.deepEqual(calls, ["lookup-user", "release"]);
});

test("getUserBySession excludes locked accounts", async () => {
  let capturedSql = "";
  const db = {
    async getConnection() {
      return {
        async query(sql: string) {
          capturedSql = sql;
          return [[], undefined] as const;
        },
        release() {}
      };
    }
  };

  assert.equal(await getUserBySession("raw-session-token", { db }), null);
  assert.match(capturedSql, /u\.account_status\s*=\s*'active'/i);
  assert.match(capturedSql, /disabled_until\s*<=/i);
});

test("login permits an expired timed deactivation but rejects an active one", async () => {
  const passwordHash = (await import("../lib/auth/password.ts")).hashPassword("Seismic#123");
  const expiredCalls: string[] = [];
  const activeCalls: string[] = [];
  const base = { id: 42, username: "storm_architect", display_name: "Storm Architect", role_name: "player", avatar_url: null, password_hash: passwordHash, account_status: "disabled" as const, disabled_forever: false };
  const expired = await loginUser({ identifier: "storm_architect", password: "Seismic#123", remember: false }, { db: makeLoginDb([{ ...base, disabled_until: new Date("2026-08-11T11:59:59Z") }], expiredCalls), now: new Date("2026-08-11T12:00:00Z") });
  const active = await loginUser({ identifier: "storm_architect", password: "Seismic#123", remember: false }, { db: makeLoginDb([{ ...base, disabled_until: new Date("2026-08-12T12:00:00Z") }], activeCalls), now: new Date("2026-08-11T12:00:00Z") });
  assert.equal(expired.ok, true);
  assert.deepEqual(active, { ok: false, status: 403, error: "Tài khoản đang bị vô hiệu hóa. Vui lòng liên hệ ban quản trị." });
});
