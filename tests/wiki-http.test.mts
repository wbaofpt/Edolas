import test from "node:test";
import assert from "node:assert/strict";
import { createWikiClusterPostHandler, createWikiPagePostHandler } from "../lib/wiki/http.ts";

const player = { id: 9, username: "stone", displayName: "Stone", roleName: "player", avatarUrl: null };

test("wiki administration rejects anonymous and non-staff users", async () => {
  const anonymous = createWikiClusterPostHandler({ getRequestUser: async () => null });
  const nonStaff = createWikiPagePostHandler({ getRequestUser: async () => player });
  const request = new Request("http://localhost/api/wiki/clusters", { method: "POST", body: "{}" });
  assert.equal((await anonymous(request)).status, 401);
  assert.equal((await nonStaff(request)).status, 403);
});

test("staff can create a validated wiki cluster", async () => {
  let received = "";
  const handler = createWikiClusterPostHandler({
    getRequestUser: async () => ({ ...player, roleName: "staff" }),
    createWikiCluster: async (input) => { received = input.slug; return 4; }
  });
  const response = await handler(new Request("http://localhost/api/wiki/clusters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Survival", slug: "survival", description: "Hướng dẫn Survival", accent: "cyan", sortOrder: 10 }) }));
  assert.equal(response.status, 201);
  assert.equal(received, "survival");
});

test("admin and owner inherit Wiki content-management permission", async () => {
  for (const roleName of ["admin", "owner"]) {
    const handler = createWikiClusterPostHandler({
      getRequestUser: async () => ({ ...player, roleName }),
      createWikiCluster: async () => 4
    });
    const response = await handler(new Request("http://localhost/api/wiki/clusters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Survival", slug: "survival", description: "Hướng dẫn Survival", accent: "cyan", sortOrder: 10 }) }));
    assert.equal(response.status, 201);
  }
});
