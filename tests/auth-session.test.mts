import test from "node:test";
import assert from "node:assert/strict";
import { getSessionCookieOptions, hashSessionToken, issueSession } from "../lib/auth/session.ts";

test("issueSession derives the correct expiry window", () => {
  const base = new Date("2026-08-11T00:00:00Z");
  const normal = issueSession(base, false);
  const remembered = issueSession(base, true);

  assert.equal(normal.expiresAt.toISOString(), "2026-08-12T00:00:00.000Z");
  assert.equal(remembered.expiresAt.toISOString(), "2026-09-10T00:00:00.000Z");
  assert.match(normal.rawToken, /^[0-9a-f]+$/);
  assert.match(normal.tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(hashSessionToken(normal.rawToken).length, 64);
});

test("getSessionCookieOptions sets the auth cookie envelope", () => {
  const expiresAt = new Date("2026-08-12T00:00:00Z");
  const options = getSessionCookieOptions(expiresAt, new Date("2026-08-11T00:00:00Z"));

  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.expires.toISOString(), expiresAt.toISOString());
  assert.equal(options.maxAge, 60 * 60 * 24);
});
