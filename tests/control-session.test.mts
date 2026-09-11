import test from "node:test";
import assert from "node:assert/strict";
import { createControlCredentials, hashControlSecret, isControlSessionActive } from "../lib/control/session.ts";

test("control credentials expose raw secrets but persist only SHA-256 hashes", () => {
  const credentials = createControlCredentials();
  assert.match(credentials.token, /^[A-Za-z0-9_-]{40,}$/);
  assert.match(credentials.csrfToken, /^[A-Za-z0-9_-]{40,}$/);
  assert.match(credentials.tokenHash, /^[a-f0-9]{64}$/);
  assert.match(credentials.csrfHash, /^[a-f0-9]{64}$/);
  assert.notEqual(credentials.token, credentials.tokenHash);
  assert.equal(credentials.tokenHash, hashControlSecret(credentials.token));
});

test("control session expires after thirty minutes of inactivity or its absolute expiry", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  assert.equal(isControlSessionActive({ lastUsedAt: new Date("2026-08-12T11:30:01Z"), expiresAt: new Date("2026-08-12T14:00:00Z") }, now), true);
  assert.equal(isControlSessionActive({ lastUsedAt: new Date("2026-08-12T11:30:00Z"), expiresAt: new Date("2026-08-12T14:00:00Z") }, now), false);
  assert.equal(isControlSessionActive({ lastUsedAt: now, expiresAt: now }, now), false);
});
