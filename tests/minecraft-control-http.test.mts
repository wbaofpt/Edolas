import test from "node:test";
import assert from "node:assert/strict";
import { createControlMinecraftRouteHandler } from "../lib/minecraft/control-http.ts";

const request = new Request("https://edolas.test/api/control/minecraft", { headers: { Cookie: "edolas_control_session=control-token" } });
const status = { network: { status: "online", online: 1, lastUpdatedAt: "2026-08-13T12:00:00.000Z", groups: [] }, servers: [] } as const;

function session(roleName: string) {
  return { id: 1, csrfHash: "hash", expiresAt: new Date("2026-08-13T12:30:00Z"), user: { id: 2, username: "operator", displayName: "Operator", roleName, avatarUrl: null } };
}

test("control minecraft endpoint requires a live Control session", async () => {
  const handler = createControlMinecraftRouteHandler({ resolveSession: async () => null, readStatus: async () => status as never });
  assert.equal((await handler(request)).status, 401);
});

test("control minecraft endpoint rejects staff and allows account admins", async () => {
  const staff = createControlMinecraftRouteHandler({ resolveSession: async () => session("staff"), readStatus: async () => status as never });
  const admin = createControlMinecraftRouteHandler({ resolveSession: async () => session("admin"), readStatus: async () => status as never });

  assert.equal((await staff(request)).status, 403);
  const response = await admin(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true, status });
});
