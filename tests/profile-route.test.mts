import test from "node:test";
import assert from "node:assert/strict";
import { resolveProfileRoute } from "../lib/profile/route.ts";

test("profile self alias resolves from decoded and URL-encoded route segments", () => {
  assert.deepEqual(resolveProfileRoute("@me", "edolas_admin"), { kind: "profile", username: "edolas_admin" });
  assert.deepEqual(resolveProfileRoute("%40me", "edolas_admin"), { kind: "profile", username: "edolas_admin" });
});

test("profile self alias requires a signed-in username", () => {
  assert.deepEqual(resolveProfileRoute("%40me", null), { kind: "login" });
});

test("public profile usernames remain decoded and unchanged", () => {
  assert.deepEqual(resolveProfileRoute("stonecrafter", null), { kind: "profile", username: "stonecrafter" });
});
