import test from "node:test";
import assert from "node:assert/strict";
import { permanentlyDeleteContent, setContentTrashState, setUserLock, setUserRole } from "../lib/admin/service.ts";

const owner = { id: 1, username: "edolas_admin", displayName: "Edolas", roleName: "owner", avatarUrl: null };
const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

function mutationDb(target: { id: number; username: string; display_name: string; role_name: string; account_status: string }) {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query(sql: string) {
      if (sql.includes("FROM users")) return [[target], undefined] as const;
      throw new Error(`Unexpected query: ${sql}`);
    },
    async execute(sql: string) {
      if (sql.includes("UPDATE users")) calls.push("update-user");
      else if (sql.includes("DELETE FROM auth_sessions")) calls.push("revoke-sessions");
      else if (sql.includes("DELETE FROM control_sessions")) calls.push("revoke-control-sessions");
      else if (sql.includes("INSERT INTO admin_audit_logs")) calls.push("audit");
      else throw new Error(`Unexpected execute: ${sql}`);
      return [{ affectedRows: 1 }, undefined] as const;
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  return { db: { async getConnection() { return connection; } }, calls };
}

test("locking a lower account revokes all sessions and records an audit in one transaction", async () => {
  const { db, calls } = mutationDb({ id: 7, username: "player", display_name: "Player", role_name: "player", account_status: "active" });
  const result = await setUserLock(admin, 7, true, "Spam diễn đàn", db as never, new Date("2026-08-12T00:00:00Z"));
  assert.deepEqual(result, { ok: true, locked: true });
  assert.deepEqual(calls, ["begin", "update-user", "revoke-sessions", "revoke-control-sessions", "audit", "commit", "release"]);
});

test("never allows the owner account to be locked or demoted", async () => {
  const target = { id: 1, username: "edolas_admin", display_name: "Edolas", role_name: "owner", account_status: "active" };
  const lock = mutationDb(target);
  const role = mutationDb(target);
  assert.deepEqual(await setUserLock(owner, 1, true, "test", lock.db as never), { ok: false, status: 403, error: "Không thể thay đổi tài khoản Owner." });
  assert.deepEqual(await setUserRole(owner, 1, "admin", role.db as never), { ok: false, status: 403, error: "Không thể thay đổi tài khoản Owner." });
  assert.deepEqual(lock.calls, ["begin", "rollback", "release"]);
  assert.deepEqual(role.calls, ["begin", "rollback", "release"]);
});

test("admin cannot promote staff to admin or manage another admin", async () => {
  const staff = mutationDb({ id: 8, username: "staff", display_name: "Staff", role_name: "staff", account_status: "active" });
  const peer = mutationDb({ id: 9, username: "peer", display_name: "Peer", role_name: "admin", account_status: "active" });
  assert.equal((await setUserRole(admin, 8, "admin", staff.db as never)).ok, false);
  assert.equal((await setUserLock(admin, 9, true, "test", peer.db as never)).ok, false);
});

test("trashing content and its audit record commit atomically", async () => {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query() { return [[], undefined] as const; },
    async execute(sql: string) { calls.push(sql.includes("admin_audit_logs") ? "audit" : "update-content"); return [{ affectedRows: 1 }, undefined] as const; },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  const db = { async getConnection() { return connection; }, async execute() { throw new Error("must use transaction connection"); }, async query() { return [[], undefined] as const; } };
  assert.deepEqual(await setContentTrashState(admin, "wiki", 12, true, db as never, new Date("2026-08-12T00:00:00Z")), { ok: true });
  assert.deepEqual(calls, ["begin", "update-content", "audit", "commit", "release"]);
});

test("attached Wiki media cannot be permanently deleted", async () => {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query(sql: string) { if (sql.includes("wiki_media")) return [[{ page_id: 7 }], undefined] as const; return [[], undefined] as const; },
    async execute() { calls.push("execute"); return [{ affectedRows: 1 }, undefined] as const; },
    async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); }
  };
  const result = await permanentlyDeleteContent(owner, "media", 5, { getConnection: async () => connection } as never);
  assert.deepEqual(result, { ok: false, status: 409, error: "Media đang được một bài Wiki sử dụng. Hãy gỡ media khỏi bài trước." });
  assert.deepEqual(calls, ["begin", "rollback", "release"]);
});
