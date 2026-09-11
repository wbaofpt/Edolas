import test from "node:test";
import assert from "node:assert/strict";
import { parseForumCategory } from "../lib/admin/forum-categories.ts";
import { deleteForumCategory, saveForumCategory } from "../lib/admin/forum-categories.ts";

const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };
const staff = { id: 3, username: "staff", displayName: "Staff", roleName: "staff", avatarUrl: null };

test("forum category validation normalizes slug and bounds sort order", () => {
  assert.deepEqual(parseForumCategory({ title: "Tin tức", slug: "tin-tuc", description: "Thông báo mới nhất", sortOrder: 20 }), { ok: true, value: { title: "Tin tức", slug: "tin-tuc", description: "Thông báo mới nhất", sortOrder: 20 } });
  assert.equal(parseForumCategory({ title: "A", slug: "INVALID SLUG", description: "x", sortOrder: 20000 }).ok, false);
});

function categoryDb(topics: number) {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query() { return [[{ topics }], undefined] as const; },
    async execute(sql: string) { calls.push(sql.includes("admin_audit_logs") ? "audit" : "mutation"); return [{ insertId: 9, affectedRows: 1 }, undefined] as const; },
    async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); }
  };
  return { calls, db: { async getConnection() { return connection; } } };
}

test("only Admin or Owner can save forum categories and writes audit atomically", async () => {
  const input = { title: "Tin tức", slug: "tin-tuc", description: "Thông báo mới nhất", sortOrder: 20 };
  assert.equal((await saveForumCategory(staff, null, input, categoryDb(0).db as never)).status, 403);
  const { db, calls } = categoryDb(0);
  assert.deepEqual(await saveForumCategory(admin, null, input, db as never), { ok: true, id: 9 });
  assert.deepEqual(calls, ["begin", "mutation", "audit", "commit", "release"]);
});

test("a forum category with topics cannot be deleted", async () => {
  const { db, calls } = categoryDb(3);
  assert.deepEqual(await deleteForumCategory(admin, 4, db as never), { ok: false, status: 409, error: "Hãy chuyển hoặc xóa các bài trong danh mục trước." });
  assert.deepEqual(calls, ["begin", "rollback", "release"]);
});
