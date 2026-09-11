import test from "node:test";
import assert from "node:assert/strict";
import { getRequestUser, isStaff } from "../lib/community/session-user.ts";

const player = {
  id: 9,
  username: "stonecrafter",
  displayName: "Stone Crafter",
  roleName: "player",
  avatarUrl: null
};

test("getRequestUser resolves the session cookie without exposing it", async () => {
  let receivedToken = "";
  const request = new Request("http://localhost/api/profile/me", {
    headers: { cookie: "theme=night; edolas_session=secret-token" }
  });

  const user = await getRequestUser(request, {
    getUserBySession: async (token) => {
      receivedToken = token ?? "";
      return player;
    }
  });

  assert.equal(receivedToken, "secret-token");
  assert.deepEqual(user, player);
});

test("staff authorization accepts only the staff role", () => {
  assert.equal(isStaff({ ...player, roleName: "staff" }), true);
  assert.equal(isStaff(player), false);
  assert.equal(isStaff(null), false);
});

