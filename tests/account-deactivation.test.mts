import test from "node:test";
import assert from "node:assert/strict";
import { isUserAccessActive, setUserDeactivation } from "../lib/admin/deactivation.ts";
import { parseUserMutation } from "../lib/admin/validation.ts";

const owner = { id: 1, username: "edolas_admin", displayName: "Owner", roleName: "owner", avatarUrl: null };
const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };
const target = { id: 7, username: "player", display_name: "Player", role_name: "player", account_status: "active", locked_at: null, disabled_forever: false };

function deactivationDb(overrides: Partial<typeof target> = {}) {
  const calls: string[] = [];
  const values: unknown[][] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query() { return [[{ ...target, ...overrides }], undefined] as const; },
    async execute(sql: string, params: unknown[]) {
      values.push(params);
      if (sql.includes("UPDATE users")) calls.push("update-user");
      else if (sql.includes("DELETE FROM auth_sessions")) calls.push("revoke-auth");
      else if (sql.includes("DELETE FROM control_sessions")) calls.push("revoke-control");
      else if (sql.includes("admin_audit_logs")) calls.push("audit");
      return [{ affectedRows: 1 }, undefined] as const;
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  return { db: { async getConnection() { return connection; } }, calls, values };
}

test("deactivation parser accepts bounded days and permanent intent", () => {
  assert.deepEqual(parseUserMutation({ action: "deactivate", duration: "days", days: 30, reason: "Vi phạm" }), { ok: true, value: { action: "deactivate", duration: "days", days: 30, reason: "Vi phạm" } });
  assert.deepEqual(parseUserMutation({ action: "deactivate", duration: "forever", reason: "Gian lận" }), { ok: true, value: { action: "deactivate", duration: "forever", reason: "Gian lận" } });
  assert.equal(parseUserMutation({ action: "deactivate", duration: "days", days: 0, reason: "Vi phạm" }).ok, false);
  assert.equal(parseUserMutation({ action: "deactivate", duration: "days", days: 366, reason: "Vi phạm" }).ok, false);
});

test("only owner can deactivate permanently", async () => {
  const blocked = deactivationDb();
  const denied = await setUserDeactivation(admin, 7, { duration: "forever", reason: "Gian lận" }, blocked.db as never);
  assert.deepEqual(denied, { ok: false, status: 403, error: "Chỉ Owner có thể vô hiệu hóa vĩnh viễn." });
  assert.deepEqual(blocked.calls, ["begin", "rollback", "release"]);
});

test("only owner can reactivate an account disabled forever", async () => {
  const blocked = deactivationDb({ account_status: "disabled", disabled_forever: true });
  const denied = await setUserDeactivation(admin, 7, null, blocked.db as never);
  assert.deepEqual(denied, { ok: false, status: 403, error: "Chỉ Owner có thể kích hoạt lại tài khoản bị vô hiệu hóa vĩnh viễn." });
});

test("deactivation preserves an existing account lock", async () => {
  const state = deactivationDb({ account_status: "locked", locked_at: new Date("2026-08-01T00:00:00Z") });
  await setUserDeactivation(owner, 7, { duration: "days", days: 7, reason: "Điều tra" }, state.db as never);
  assert.equal(state.values[0]?.[0], "locked");
  assert.equal(isUserAccessActive({ accountStatus: "locked", disabledForever: false, disabledUntil: new Date("2026-08-01T00:00:00Z") }, new Date("2026-08-12T00:00:00Z")), false);
});

test("deactivation revokes website and control sessions atomically", async () => {
  const state = deactivationDb();
  const now = new Date("2026-08-12T00:00:00Z");
  const result = await setUserDeactivation(owner, 7, { duration: "forever", reason: "Gian lận" }, state.db as never, now);
  assert.deepEqual(result, { ok: true, disabledUntil: null, disabledForever: true });
  assert.deepEqual(state.calls, ["begin", "update-user", "revoke-auth", "revoke-control", "audit", "commit", "release"]);
});

test("timed deactivation expires automatically", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  assert.equal(isUserAccessActive({ accountStatus: "disabled", disabledForever: false, disabledUntil: new Date("2026-08-12T11:59:59Z") }, now), true);
  assert.equal(isUserAccessActive({ accountStatus: "disabled", disabledForever: false, disabledUntil: new Date("2026-08-12T12:00:01Z") }, now), false);
  assert.equal(isUserAccessActive({ accountStatus: "disabled", disabledForever: true, disabledUntil: null }, now), false);
  assert.equal(isUserAccessActive({ accountStatus: "disabled", disabledForever: false, disabledUntil: null }, now), false);
  assert.equal(isUserAccessActive({ accountStatus: "locked", disabledForever: false, disabledUntil: null }, now), false);
});
