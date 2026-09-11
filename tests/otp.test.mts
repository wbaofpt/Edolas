import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOtp } from "../lib/auth/otp.ts";

test("normalizeOtp keeps only the first six ASCII digits", () => {
  assert.equal(normalizeOtp(" 48-12 05 "), "481205");
  assert.equal(normalizeOtp("12ab34cd5678"), "123456");
  assert.equal(normalizeOtp("mã xác nhận"), "");
});

