import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/auth/password.ts";

test("hashPassword emits salt:hash and verifyPassword accepts the same password", () => {
  const hashed = hashPassword("Seismic#123");

  assert.match(hashed, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword("Seismic#123", hashed), true);
  assert.equal(verifyPassword("wrong-password", hashed), false);
});
