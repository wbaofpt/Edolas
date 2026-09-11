import test from "node:test";
import assert from "node:assert/strict";
import { parseBulkContentMutation, parseContentOperation } from "../lib/admin/validation.ts";
import { applyContentOperation, bulkSetContentTrash } from "../lib/admin/content-operations.ts";

const staff = { id: 3, username: "staff", displayName: "Staff", roleName: "staff", avatarUrl: null };

test("bulk content parser accepts unique bounded items and rejects more than 100", () => {
  assert.deepEqual(parseBulkContentMutation({ action: "trash", items: [{ kind: "forum", id: 3 }, { kind: "wiki", id: 7 }] }), {
    ok: true,
    value: { action: "trash", items: [{ kind: "forum", id: 3 }, { kind: "wiki", id: 7 }] }
  });
  assert.equal(parseBulkContentMutation({ action: "trash", items: Array.from({ length: 101 }, (_, index) => ({ kind: "forum", id: index + 1 })) }).ok, false);
  assert.equal(parseBulkContentMutation({ action: "trash", items: [{ kind: "users", id: 1 }] }).ok, false);
});

test("content operation parser exposes only supported forum and Wiki transitions", () => {
  assert.deepEqual(parseContentOperation("forum", { action: "pin", pinned: true }), { ok: true, value: { action: "pin", pinned: true } });
  assert.deepEqual(parseContentOperation("forum", { action: "move", categoryId: 4 }), { ok: true, value: { action: "move", categoryId: 4 } });
  assert.deepEqual(parseContentOperation("wiki", { action: "publish", published: false }), { ok: true, value: { action: "publish", published: false } });
  assert.equal(parseContentOperation("media", { action: "publish", published: true }).ok, false);
});

function transactionDb(options: { categoryExists?: boolean; affectedRows?: number } = {}) {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query(sql: string) {
      if (sql.includes("forum_categories")) return [options.categoryExists === false ? [] : [{ id: 4 }], undefined] as const;
      return [[], undefined] as const;
    },
    async execute(sql: string) {
      if (sql.includes("admin_audit_logs")) calls.push("audit");
      else calls.push("mutation");
      return [{ affectedRows: options.affectedRows ?? 1 }, undefined] as const;
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  return { calls, db: { async getConnection() { return connection; } } };
}

test("forum move and audit commit in the same transaction", async () => {
  const { db, calls } = transactionDb();
  assert.deepEqual(await applyContentOperation(staff, "forum", 8, { action: "move", categoryId: 4 }, db as never), { ok: true });
  assert.deepEqual(calls, ["begin", "mutation", "audit", "commit", "release"]);
});

test("bulk trash writes every item and one audit atomically", async () => {
  const { db, calls } = transactionDb();
  const result = await bulkSetContentTrash(staff, [{ kind: "forum", id: 2 }, { kind: "media", id: 9 }], true, db as never, new Date("2026-08-12T00:00:00Z"));
  assert.deepEqual(result, { ok: true, count: 2 });
  assert.deepEqual(calls, ["begin", "mutation", "mutation", "audit", "commit", "release"]);
});

test("bulk trash rolls back when any selected item no longer exists", async () => {
  const { db, calls } = transactionDb({ affectedRows: 0 });
  const result = await bulkSetContentTrash(staff, [{ kind: "forum", id: 404 }], true, db as never);
  assert.deepEqual(result, { ok: false, status: 409, error: "Một nội dung đã thay đổi hoặc không còn tồn tại. Vui lòng tải lại danh sách." });
  assert.deepEqual(calls, ["begin", "mutation", "rollback", "release"]);
});
