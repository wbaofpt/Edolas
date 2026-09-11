import test from "node:test";
import assert from "node:assert/strict";
import { parseWebsiteResource, saveWebsiteResource, setWebsiteResourceTrash } from "../lib/control/website-resources.ts";
import { createControlWebsiteCollectionHandler } from "../lib/control/website-http.ts";

const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

test("website resource validation only accepts whitelisted fields and kinds", () => {
  assert.deepEqual(parseWebsiteResource("announcement", { title: "Mùa mới", body: "Nội dung thông báo đủ dài", publishedAt: "2026-08-12" }), { ok: true, value: { title: "Mùa mới", body: "Nội dung thông báo đủ dài", publishedAt: "2026-08-12" } });
  assert.equal(parseWebsiteResource("announcement", { title: "x", body: "y", secret: "leak" }).ok, false);
  assert.equal(parseWebsiteResource("unknown", {}).ok, false);
  assert.deepEqual(parseWebsiteResource("stat", { statKey: "online_today", statValue: "128", statDetail: "Đang trực tuyến" }), { ok: true, value: { statKey: "online_today", statValue: "128", statDetail: "Đang trực tuyến" } });
  assert.deepEqual(parseWebsiteResource("game-mode", { slug: "survival", name: "Survival", summary: "Sinh tồn cân bằng cho cộng đồng Edolas.", status: "active", tags: [" PE/PC ", "Survival", "pe/pc"] }), { ok: true, value: { slug: "survival", name: "Survival", summary: "Sinh tồn cân bằng cho cộng đồng Edolas.", status: "active", tags: ["PE/PC", "Survival"] } });
  assert.equal(parseWebsiteResource("game-mode", { slug: "survival", name: "Survival", summary: "Sinh tồn cân bằng cho cộng đồng Edolas.", status: "active", tags: [] }).ok, false);
});

test("saving a website resource uses a fixed table and records audit atomically", async () => {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async execute(sql: string) { calls.push(sql.includes("admin_audit_logs") ? "audit" : "write:game_modes"); return [{ insertId: 9, affectedRows: 1 }, undefined] as const; },
    async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); }
  };
  const result = await saveWebsiteResource(admin, "game-mode", null, { slug: "hardcore", name: "Hardcore", summary: "Sinh tồn thử thách dành cho người chơi kỳ cựu.", status: "active", tags: ["PE/PC", "Hardcore"] }, { getConnection: async () => connection } as never);
  assert.deepEqual(result, { ok: true, id: 9 });
  assert.deepEqual(calls, ["begin", "write:game_modes", "audit", "commit", "release"]);
});

test("resource trash never accepts an arbitrary table name", async () => {
  const db = { getConnection: async () => { throw new Error("database must not be touched"); } };
  assert.deepEqual(await setWebsiteResourceTrash(admin, "users" as never, 1, true, db as never), { ok: false, status: 400, error: "Loại dữ liệu website không hợp lệ." });
});

test("server stats use the same recoverable thirty-day trash flow", async () => {
  const statements: string[] = [];
  const connection = { async beginTransaction() {}, async execute(sql: string) { statements.push(sql); return [{ affectedRows: 1 }, undefined] as const; }, async commit() {}, async rollback() {}, release() {} };
  assert.deepEqual(await setWebsiteResourceTrash(admin, "stat", 4, true, { getConnection: async () => connection } as never), { ok: true });
  assert.equal(statements.some((sql) => /UPDATE server_stats SET deleted_at/.test(sql)), true);
  assert.equal(statements.some((sql) => /DELETE FROM server_stats/.test(sql)), false);
});

test("website resource API requires control session and settings permission", async () => {
  const request = new Request("https://edolas.vn/api/control/website/rule", { method: "POST", headers: { origin: "https://edolas.vn", host: "edolas.vn", cookie: "edolas_control_session=session; edolas_control_csrf=csrf", "x-control-csrf": "csrf" }, body: "{}" });
  const anonymous = createControlWebsiteCollectionHandler({ resolveControlSession: async () => null });
  assert.equal((await anonymous(request, { params: { kind: "rule" } })).status, 401);
  const staff = createControlWebsiteCollectionHandler({ resolveControlSession: async () => ({ id: 1, user: { ...admin, roleName: "staff" }, csrfHash: "hash", expiresAt: new Date() }) });
  assert.equal((await staff(request, { params: { kind: "rule" } })).status, 403);
});
