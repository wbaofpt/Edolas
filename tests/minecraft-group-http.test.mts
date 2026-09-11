import test from "node:test";
import assert from "node:assert/strict";
import { createMinecraftGroupDeleteHandler } from "../lib/minecraft/group-http.ts";

const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

function request(overrides: Record<string, string> = {}) {
  return new Request("https://edolas.vn/api/control/minecraft/groups/survival", {
    method: "DELETE",
    headers: {
      origin: "https://edolas.vn",
      host: "edolas.vn",
      cookie: "edolas_control_session=session; edolas_control_csrf=csrf",
      "x-control-csrf": "csrf",
      ...overrides
    }
  });
}

function session(roleName = "admin") {
  return { id: 8, user: { ...admin, roleName }, csrfHash: "hash", expiresAt: new Date() };
}

test("Minecraft group DELETE requires same-origin CSRF and an account admin session", async () => {
  let deletes = 0;
  const handler = createMinecraftGroupDeleteHandler({
    resolveSession: async () => session(),
    deleteGroup: async () => { deletes += 1; return { ok: true, group: "survival", deletedServers: 1 }; }
  });
  assert.equal((await handler(request({ origin: "https://evil.vn" }), { params: { group: "survival" } })).status, 403);
  assert.equal((await handler(request({ "x-control-csrf": "wrong" }), { params: { group: "survival" } })).status, 403);

  const expired = createMinecraftGroupDeleteHandler({ resolveSession: async () => null, deleteGroup: async () => { deletes += 1; return { ok: true, group: "survival", deletedServers: 1 }; } });
  assert.equal((await expired(request(), { params: { group: "survival" } })).status, 401);

  const staff = createMinecraftGroupDeleteHandler({ resolveSession: async () => session("staff"), deleteGroup: async () => { deletes += 1; return { ok: true, group: "survival", deletedServers: 1 }; } });
  assert.equal((await staff(request(), { params: { group: "survival" } })).status, 403);
  assert.equal(deletes, 0);
});

test("Minecraft group DELETE validates group keys and maps service results", async () => {
  const seen: string[] = [];
  const handler = createMinecraftGroupDeleteHandler({
    resolveSession: async () => session(),
    deleteGroup: async (_actor, group) => {
      seen.push(group);
      if (group === "missing") return { ok: false, status: 404, error: "Cụm máy chủ không tồn tại." };
      if (group === "active") return { ok: false, status: 409, error: "Cụm vừa hoạt động trở lại nên không thể xóa." };
      return { ok: true, group, deletedServers: 2 };
    }
  });

  assert.equal((await handler(request(), { params: { group: "Bad Group" } })).status, 400);
  assert.equal((await handler(request(), { params: { group: "missing" } })).status, 404);
  assert.equal((await handler(request(), { params: { group: "active" } })).status, 409);
  const response = await handler(request(), { params: { group: "survival" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true, group: "survival", deletedServers: 2 });
  assert.deepEqual(seen, ["missing", "active", "survival"]);
});

test("Minecraft group DELETE hides database failures", async () => {
  const handler = createMinecraftGroupDeleteHandler({ resolveSession: async () => session(), deleteGroup: async () => { throw new Error("SQL secret"); } });
  const response = await handler(request(), { params: { group: "survival" } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Không thể xóa dữ liệu cụm lúc này." });
});
