import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { parseTelemetryKeys } from "../lib/minecraft/config.ts";
import { createCanonicalRequest, verifyTelemetrySignature } from "../lib/minecraft/protocol.ts";

const secret = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");

test("telemetry canonical request hashes the exact UTF-8 body", () => {
  const rawBody = '{"schemaVersion":1,"message":"xin chao"}';
  const canonical = createCanonicalRequest({ serverId: "survival-01", timestamp: "1786636800", nonce: "abc123", rawBody });
  const bodyHash = createHash("sha256").update(rawBody, "utf8").digest("hex");

  assert.equal(canonical, `v1\nsurvival-01\n1786636800\nabc123\n${bodyHash}`);
});

test("telemetry signature accepts only the matching v1 HMAC", () => {
  const canonical = createCanonicalRequest({ serverId: "survival-01", timestamp: "1786636800", nonce: "abc123", rawBody: "{}" });
  const signature = `v1=${createHmac("sha256", secret).update(canonical, "utf8").digest("hex")}`;

  assert.equal(verifyTelemetrySignature({ canonical, signature, secret }), true);
  assert.equal(verifyTelemetrySignature({ canonical: `${canonical}x`, signature, secret }), false);
  assert.equal(verifyTelemetrySignature({ canonical, signature: signature.slice(0, -2), secret }), false);
  assert.equal(verifyTelemetrySignature({ canonical, signature: `v2=${signature.slice(3)}`, secret }), false);
});

test("telemetry key parser validates ids and minimum secret strength", () => {
  const keys = parseTelemetryKeys({ MINECRAFT_TELEMETRY_KEYS: JSON.stringify({ "survival-01": secret.toString("utf8") }) });
  assert.deepEqual(keys.get("survival-01"), secret);
  assert.throws(() => parseTelemetryKeys({ MINECRAFT_TELEMETRY_KEYS: "{}" }), /at least one server/i);
  assert.throws(() => parseTelemetryKeys({ MINECRAFT_TELEMETRY_KEYS: JSON.stringify({ "BAD ID": secret.toString("utf8") }) }), /server id/i);
  assert.throws(() => parseTelemetryKeys({ MINECRAFT_TELEMETRY_KEYS: JSON.stringify({ "survival-01": "short" }) }), /32 bytes/i);
});
