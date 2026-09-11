import test from "node:test";
import assert from "node:assert/strict";
import { createPaymentStatusHandler, createSandboxCompleteHandler } from "../lib/store/payments/http.ts";

test("payment status requires the signed-in owner", async () => {
  const handler = createPaymentStatusHandler({ getUser: async () => null });
  const response = await handler(new Request("https://edolas.test/api/store/orders/EDO/payment"), { params: { reference: "EDO" } });
  assert.equal(response.status, 401);
});

test("payment status scopes lookup to the current user", async () => {
  const lookups: Array<[string, number]> = [];
  const handler = createPaymentStatusHandler({
    getUser: async () => ({ id: 7, username: "member", displayName: "Member", roleName: "player", avatarUrl: null }),
    getPayment: async (reference, userId) => { lookups.push([reference, userId]); return null; },
  });
  const response = await handler(new Request("https://edolas.test/api/store/orders/EDO/payment"), { params: { reference: "EDO-PRIVATE" } });
  assert.equal(response.status, 404);
  assert.deepEqual(lookups, [["EDO-PRIVATE", 7]]);
});

test("sandbox completion rejects cross-origin requests", async () => {
  const handler = createSandboxCompleteHandler({ complete: async () => ({ ok: true, duplicate: false }) });
  const response = await handler(new Request("https://edolas.test/api/store/payments/sandbox/token/complete", { method: "POST", headers: { origin: "https://evil.test", host: "edolas.test" } }), { params: { token: "a".repeat(43) } });
  assert.equal(response.status, 403);
});
