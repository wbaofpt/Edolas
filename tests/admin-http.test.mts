import test from "node:test";
import assert from "node:assert/strict";
import { createAdminContentHandler, createAdminSettingsHandler, createAdminUserHandler } from "../lib/admin/http.ts";

const player = { id: 4, username: "player", displayName: "Player", roleName: "player", avatarUrl: null };
const staff = { id: 3, username: "staff", displayName: "Staff", roleName: "staff", avatarUrl: null };
const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

test("admin user endpoint requires authentication and account-management permission", async () => {
  const handler = createAdminUserHandler({ getRequestUser: async () => null });
  assert.equal((await handler(new Request("http://local/api/admin/users/7", { method: "PATCH", body: "{}" }), { params: { id: "7" } })).status, 401);
  const forbidden = createAdminUserHandler({ getRequestUser: async () => player });
  assert.equal((await forbidden(new Request("http://local/api/admin/users/7", { method: "PATCH", body: "{}" }), { params: { id: "7" } })).status, 403);
});

test("admin user endpoint dispatches a validated lock action", async () => {
  let called = false;
  const handler = createAdminUserHandler({
    getRequestUser: async () => admin,
    setUserLock: async (_actor, id, locked, reason) => { called = id === 7 && locked && reason === "Spam"; return { ok: true, locked: true }; }
  });
  const response = await handler(new Request("http://local/api/admin/users/7", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "lock", locked: true, reason: "Spam" }) }), { params: { id: "7" } });
  assert.equal(response.status, 200);
  assert.equal(called, true);
});

test("admin user endpoint dispatches timed deactivation and reactivation", async () => {
  const calls: unknown[] = [];
  const handler = createAdminUserHandler({
    getRequestUser: async () => admin,
    setUserDeactivation: async (_actor, id, input) => {
      calls.push(id, input);
      return { ok: true, disabledUntil: null, disabledForever: input?.duration === "forever" };
    }
  });
  const disabled = await handler(new Request("http://local/api/admin/users/7", { method: "PATCH", body: JSON.stringify({ action: "deactivate", duration: "days", days: 14, reason: "Vi phạm" }) }), { params: { id: "7" } });
  const restored = await handler(new Request("http://local/api/admin/users/7", { method: "PATCH", body: JSON.stringify({ action: "reactivate" }) }), { params: { id: "7" } });
  assert.equal(disabled.status, 200);
  assert.equal(restored.status, 200);
  assert.deepEqual(calls, [7, { duration: "days", days: 14, reason: "Vi phạm" }, 7, null]);
});

test("staff can trash content but cannot permanently delete it", async () => {
  const trash = createAdminContentHandler({ getRequestUser: async () => staff, setContentTrashState: async () => ({ ok: true }) });
  assert.equal((await trash(new Request("http://local/api/admin/content/wiki/5", { method: "PATCH", body: JSON.stringify({ action: "trash" }) }), { params: { kind: "wiki", id: "5" } })).status, 200);
  const permanent = createAdminContentHandler({ getRequestUser: async () => staff });
  assert.equal((await permanent(new Request("http://local/api/admin/content/wiki/5", { method: "PATCH", body: JSON.stringify({ action: "delete-permanently", confirmation: "XOA VINH VIEN" }) }), { params: { kind: "wiki", id: "5" } })).status, 403);
});

test("settings endpoint accepts admin and rejects staff", async () => {
  const forbidden = createAdminSettingsHandler({ getRequestUser: async () => staff });
  assert.equal((await forbidden(new Request("http://local/api/admin/settings", { method: "PATCH", body: "{}" }))).status, 403);
  const allowed = createAdminSettingsHandler({ getRequestUser: async () => admin, updateSiteSettings: async () => ({ ok: true }) });
  assert.equal((await allowed(new Request("http://local/api/admin/settings", { method: "PATCH", body: JSON.stringify({ settings: { server_name: "Edolas SG" } }) }))).status, 200);
});
