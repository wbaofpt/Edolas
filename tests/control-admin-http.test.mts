import test from "node:test";
import assert from "node:assert/strict";
import { createControlAdminSettingsHandler, createControlAdminUserHandler } from "../lib/control/admin-http.ts";

const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

function controlRequest(url: string, body: unknown, overrides: Record<string, string> = {}) {
  return new Request(url, {
    method: "PATCH",
    headers: {
      origin: "https://edolas.vn",
      host: "edolas.vn",
      cookie: "edolas_control_session=session; edolas_control_csrf=csrf",
      "x-control-csrf": "csrf",
      "content-type": "application/json",
      ...overrides
    },
    body: JSON.stringify(body)
  });
}

test("control admin mutation rejects requests without valid origin or control session", async () => {
  const handler = createControlAdminUserHandler({ resolveControlSession: async () => null });
  const wrongOrigin = controlRequest("https://edolas.vn/api/control/users/7", {}, { origin: "https://evil.vn" });
  assert.equal((await handler(wrongOrigin, { params: { id: "7" } })).status, 403);
  assert.equal((await handler(controlRequest("https://edolas.vn/api/control/users/7", {}), { params: { id: "7" } })).status, 401);
});

test("control admin mutation binds CSRF to the control session before dispatch", async () => {
  let resolvedWith = "";
  let locked = false;
  const handler = createControlAdminUserHandler({
    resolveControlSession: async (_token, deps) => {
      resolvedWith = deps?.csrfToken ?? "";
      return { id: 5, user: admin, csrfHash: "hash", expiresAt: new Date("2026-08-12T14:00:00Z") };
    },
    setUserLock: async () => { locked = true; return { ok: true, locked: true }; }
  });
  const response = await handler(controlRequest("https://edolas.vn/api/control/users/7", { action: "lock", locked: true, reason: "spam" }), { params: { id: "7" } });
  assert.equal(response.status, 200);
  assert.equal(resolvedWith, "csrf");
  assert.equal(locked, true);
});

test("control settings mutation uses the same guard", async () => {
  let updated = false;
  const handler = createControlAdminSettingsHandler({
    resolveControlSession: async () => ({ id: 5, user: admin, csrfHash: "hash", expiresAt: new Date("2026-08-12T14:00:00Z") }),
    updateSiteSettings: async () => { updated = true; return { ok: true }; }
  });
  const response = await handler(controlRequest("https://edolas.vn/api/control/settings", { settings: { server_name: "EdolasSG" } }));
  assert.equal(response.status, 200);
  assert.equal(updated, true);
});

test("legacy admin mutation routes are retired", async () => {
  const sources = await Promise.all([
    import("../app/api/admin/users/[id]/route.ts"),
    import("../app/api/admin/content/[kind]/[id]/route.ts"),
    import("../app/api/admin/settings/route.ts")
  ]);
  for (const route of sources) {
    const response = await route.PATCH(new Request("https://edolas.vn/api/admin/retired", { method: "PATCH" }), { params: { id: "1", kind: "wiki" } } as never);
    assert.equal(response.status, 410);
  }
});
