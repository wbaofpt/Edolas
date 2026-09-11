import test from "node:test";
import assert from "node:assert/strict";
import { createProfileUpdateHandler, createFollowHandler } from "../lib/profile/http.ts";

const user = { id: 9, username: "stonecrafter", displayName: "Stone", roleName: "player", avatarUrl: null };

test("profile mutations reject requests without a session", async () => {
  const handler = createProfileUpdateHandler({ getRequestUser: async () => null });
  const response = await handler(new Request("http://localhost/api/profile/me", { method: "PATCH", body: JSON.stringify({ displayName: "Stone", bio: "Builder" }) }));
  assert.equal(response.status, 401);
});

test("profile update validates and persists owner fields", async () => {
  let saved: unknown[] = [];
  const handler = createProfileUpdateHandler({
    getRequestUser: async () => user,
    updateOwnProfile: async (...values) => { saved = values; }
  });
  const response = await handler(new Request("http://localhost/api/profile/me", { method: "PATCH", body: JSON.stringify({ displayName: " Stone Crafter ", bio: " Builder " }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(saved, [9, "Stone Crafter", "Builder"]);
});

test("follow route targets the profile username and returns toggle state", async () => {
  const handler = createFollowHandler({
    getRequestUser: async () => user,
    getProfileByUsername: async () => ({ id: 12 } as never),
    toggleFollow: async (from, to) => ({ ok: true, following: from === 9 && to === 12 })
  });
  const response = await handler(new Request("http://localhost/api/profile/sky/follow", { method: "POST" }), { params: { username: "sky" } });
  assert.deepEqual(await response.json(), { ok: true, following: true });
});

