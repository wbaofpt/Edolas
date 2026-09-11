import assert from "node:assert/strict";
import test from "node:test";
import {
  createVerification,
  getVerificationRetryAfter,
  removeVerification
} from "../lib/email-verification.ts";

test("verification requests expose a 60 second cooldown", () => {
  const email = "cooldown@example.com";
  removeVerification(email);

  createVerification(email, 1_000);

  assert.equal(getVerificationRetryAfter(email, 1_000), 60);
  assert.equal(getVerificationRetryAfter(email, 60_000), 1);
  assert.equal(getVerificationRetryAfter(email, 61_000), 0);
});

test("removeVerification clears an undelivered code and its cooldown", () => {
  const email = "delivery-failed@example.com";
  createVerification(email, 5_000);

  removeVerification(email);

  assert.equal(getVerificationRetryAfter(email, 5_000), 0);
});

