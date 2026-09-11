import test from "node:test";
import assert from "node:assert/strict";
import {
  createControlBulkContentHandler,
  createControlContentOperationHandler,
  createControlForumCategoryCollectionHandler,
  createControlSessionItemHandler
} from "../lib/control/operations-http.ts";

const staff = { id: 3, username: "staff", displayName: "Staff", roleName: "staff", avatarUrl: null };
const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };
const session = (user = staff) => ({ id: 9, user, csrfHash: "hash", expiresAt: new Date("2026-08-13T00:00:00Z") });

function request(path: string, body: unknown, method = "PATCH") {
  return new Request(`https://edolas.vn${path}`, {
    method,
    headers: { origin: "https://edolas.vn", host: "edolas.vn", cookie: "edolas_control_session=session; edolas_control_csrf=csrf", "x-control-csrf": "csrf", "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("bulk content endpoint validates Control CSRF before dispatch", async () => {
  const handler = createControlBulkContentHandler({ resolveControlSession: async () => session() as never });
  const response = await handler(new Request("https://edolas.vn/api/control/content/bulk", { method: "PATCH", body: "{}" }));
  assert.equal(response.status, 403);
});

test("Staff can run validated content operations and bulk trash", async () => {
  let operation = ""; let count = 0;
  const itemHandler = createControlContentOperationHandler({ resolveControlSession: async () => session() as never, applyContentOperation: async (_actor, _kind, _id, value) => { operation = value.action; return { ok: true }; } });
  const bulkHandler = createControlBulkContentHandler({ resolveControlSession: async () => session() as never, bulkSetContentTrash: async (_actor, items) => { count = items.length; return { ok: true, count }; } });
  assert.equal((await itemHandler(request("/api/control/content/forum/8/operation", { action: "pin", pinned: true }), { params: { kind: "forum", id: "8" } })).status, 200);
  assert.equal((await bulkHandler(request("/api/control/content/bulk", { action: "trash", items: [{ kind: "forum", id: 8 }] }))).status, 200);
  assert.equal(operation, "pin"); assert.equal(count, 1);
});

test("Staff cannot manage categories while Admin can create one", async () => {
  let saved = false;
  const staffHandler = createControlForumCategoryCollectionHandler({ resolveControlSession: async () => session() as never });
  const adminHandler = createControlForumCategoryCollectionHandler({ resolveControlSession: async () => session(admin) as never, saveForumCategory: async () => { saved = true; return { ok: true, id: 7 }; } });
  const body = { title: "Tin tức", slug: "tin-tuc", description: "Thông báo mới", sortOrder: 10 };
  assert.equal((await staffHandler(request("/api/control/forum/categories", body, "POST"))).status, 403);
  assert.equal((await adminHandler(request("/api/control/forum/categories", body, "POST"))).status, 201);
  assert.equal(saved, true);
});

test("session endpoint requires Admin and dispatches a validated session kind", async () => {
  let revoked = "";
  const handler = createControlSessionItemHandler({ resolveControlSession: async () => session(admin) as never, revokeAdminSession: async (_actor, kind, id) => { revoked = `${kind}:${id}`; return { ok: true }; } });
  const response = await handler(request("/api/control/sessions/website/12", {}, "DELETE"), { params: { kind: "website", id: "12" } });
  assert.equal(response.status, 200);
  assert.equal(revoked, "website:12");
});
