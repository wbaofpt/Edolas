import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isValidNewUsername, parseRegisterBody } from "../lib/auth/validation.ts";

const validRegistration = {
  displayName: "Storm Architect",
  username: "Storm2026",
  email: "storm@example.com",
  password: "Seismic#123",
  referralCode: null
};

test("new usernames accept only unaccented ASCII letters and numbers", () => {
  assert.equal(isValidNewUsername("Storm2026"), true);

  for (const username of ["storm_architect", "Đolas2026", "storm architect", "ab"]) {
    assert.equal(isValidNewUsername(username), false, username);
    const result = parseRegisterBody({ ...validRegistration, username });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.fieldErrors.username);
  }
});
