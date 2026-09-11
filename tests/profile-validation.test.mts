import test from "node:test";
import assert from "node:assert/strict";
import { parseProfileUpdate, validateAvatarBytes } from "../lib/profile/validation.ts";

test("profile update trims valid fields and rejects oversized biographies", () => {
  assert.deepEqual(parseProfileUpdate({ displayName: "  Stone Crafter  ", bio: "  Builder  " }), {
    ok: true,
    value: { displayName: "Stone Crafter", bio: "Builder" }
  });
  assert.equal(parseProfileUpdate({ displayName: "Stone", bio: "x".repeat(501) }).ok, false);
});

test("avatar validation recognizes image signatures instead of trusting the filename", () => {
  assert.deepEqual(validateAvatarBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]), 5), { ok: true, extension: "png" });
  assert.deepEqual(validateAvatarBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xee]), 4), { ok: true, extension: "jpg" });
  assert.deepEqual(validateAvatarBytes(new TextEncoder().encode("RIFF1234WEBP"), 12), { ok: true, extension: "webp" });
  assert.equal(validateAvatarBytes(new TextEncoder().encode("not an image"), 12).ok, false);
  assert.equal(validateAvatarBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 3 * 1024 * 1024 + 1).ok, false);
});

