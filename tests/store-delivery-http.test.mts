import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createCanonicalRequest } from "../lib/minecraft/protocol.ts";
import { createStoreDeliveryHandler } from "../lib/store/delivery-http.ts";

const secret = Buffer.from("a".repeat(32));
const now = new Date("2026-08-14T10:00:00Z");
const groups = () => new Map([["survival-01", "survival"]]);
function signed(body: unknown) {
  const raw = JSON.stringify(body),
    timestamp = String(now.getTime() / 1000),
    nonce = "nonce_nonce_nonce_123";
  const canonical = createCanonicalRequest({
    serverId: "survival-01",
    timestamp,
    nonce,
    rawBody: raw,
  });
  const signature = `v1=${createHmac("sha256", secret).update(canonical).digest("hex")}`;
  return new Request("https://edolas.test/api/minecraft/deliveries", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-edolas-server-id": "survival-01",
      "x-edolas-timestamp": timestamp,
      "x-edolas-nonce": nonce,
      "x-edolas-signature": signature,
    },
    body: raw,
  });
}
test("delivery endpoint rejects unsigned plugin requests", async () => {
  const handler = createStoreDeliveryHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: groups,
  });
  const response = await handler(
    new Request("https://edolas.test/api/minecraft/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(response.status, 401);
});
test("delivery endpoint returns one claimed command and supports empty queues", async () => {
  let expectedGroup = "";
  const handler = createStoreDeliveryHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: groups,
    claim: async (input) => {
      expectedGroup = input.expectedGroup;
      return {
        deliveryId: 2,
        claimToken: "x".repeat(43),
        command: "say hello",
      };
    },
  });
  const response = await handler(signed({ schemaVersion: 1, action: "claim" }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).delivery.command, "say hello");
  assert.equal(expectedGroup, "survival");
});
test("delivery completion requires a bounded claim token", async () => {
  const handler = createStoreDeliveryHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: groups,
    complete: async () => ({ ok: true }),
  });
  assert.equal(
    (
      await handler(
        signed({
          schemaVersion: 1,
          action: "complete",
          deliveryId: 2,
          claimToken: "short",
          success: true,
          output: "ok",
        }),
      )
    ).status,
    400,
  );
});

test("delivery rejects oversized declared bodies before authentication", async () => {
  const request = signed({ schemaVersion: 1, action: "claim" });
  request.headers.set("content-length", String(16 * 1024 + 1));
  const handler = createStoreDeliveryHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: groups,
  });
  assert.equal((await handler(request)).status, 413);
});
