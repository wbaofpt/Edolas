import test from "node:test";
import assert from "node:assert/strict";
import { listAdminSessions, revokeAdminSession } from "../lib/admin/sessions.ts";

const owner = { id: 1, username: "edolas_admin", displayName: "Owner", roleName: "owner", avatarUrl: null };
const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

test("session listing returns metadata without token hashes", async () => {
  const db = { async query() { return [[{ id: 7, kind: "website", user_id: 5, username: "player", display_name: "Player", role_name: "player", created_at: new Date(), last_used_at: new Date(), expires_at: new Date() }], undefined] as const; } };
  const rows = await listAdminSessions({}, db as never);
  assert.equal(rows[0].username, "player");
  assert.equal("tokenHash" in rows[0], false);
});

function revokeDb(target: { id: number; username: string; role_name: string }) {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query() { return [[target], undefined] as const; },
    async execute(sql: string) { calls.push(sql.includes("admin_audit_logs") ? "audit" : "delete"); return [{ affectedRows: 1 }, undefined] as const; },
    async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); }
  };
  return { calls, db: { async getConnection() { return connection; } } };
}

test("Admin cannot revoke own, Owner, or peer Admin sessions", async () => {
  assert.equal((await revokeAdminSession(admin, "website", 1, revokeDb({ id: 2, username: "admin", role_name: "admin" }).db as never)).status, 403);
  assert.equal((await revokeAdminSession(admin, "website", 1, revokeDb({ id: 1, username: "edolas_admin", role_name: "owner" }).db as never)).status, 403);
  assert.equal((await revokeAdminSession(admin, "control", 1, revokeDb({ id: 4, username: "peer", role_name: "admin" }).db as never)).status, 403);
});

test("Owner can revoke a lower account session with an audit", async () => {
  const { db, calls } = revokeDb({ id: 5, username: "player", role_name: "player" });
  assert.deepEqual(await revokeAdminSession(owner, "website", 9, db as never), { ok: true });
  assert.deepEqual(calls, ["begin", "delete", "audit", "commit", "release"]);
});
