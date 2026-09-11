import assert from "node:assert/strict";
import test from "node:test";
import { createRequestEmailCodeHandler } from "../lib/auth/email-verification-http.ts";

function request(email: string) {
  return new Request("http://localhost/api/auth/request-email-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

test("request-code handler sends the generated code through Gmail", async () => {
  let delivery: { to: string; code: string } | undefined;
  const handler = createRequestEmailCodeHandler({
    nodeEnv: "production",
    now: () => 1_000,
    getRetryAfter: () => 0,
    createVerification: () => "481205",
    removeVerification: () => undefined,
    sendEmail: async (message) => {
      delivery = message;
    }
  });

  const response = await handler(request(" Player@Example.com "));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(delivery, { to: "player@example.com", code: "481205" });
  assert.equal(body.retryAfter, 60);
  assert.equal(body.devCode, undefined);
});

test("request-code handler reports the active cooldown", async () => {
  const handler = createRequestEmailCodeHandler({
    nodeEnv: "production",
    now: () => 1_000,
    getRetryAfter: () => 37,
    createVerification: () => {
      throw new Error("must not create a code during cooldown");
    },
    removeVerification: () => undefined,
    sendEmail: async () => undefined
  });

  const response = await handler(request("player@example.com"));
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(body.retryAfter, 37);
});

test("request-code handler removes an undelivered verification", async () => {
  let removedEmail = "";
  const handler = createRequestEmailCodeHandler({
    nodeEnv: "production",
    now: () => 1_000,
    getRetryAfter: () => 0,
    createVerification: () => "481205",
    removeVerification: (email) => {
      removedEmail = email;
    },
    sendEmail: async () => {
      throw new Error("SMTP unavailable");
    },
    logDeliveryFailure: () => undefined
  });

  const response = await handler(request("player@example.com"));

  assert.equal(response.status, 502);
  assert.equal(removedEmail, "player@example.com");
});

test("request-code handler keeps the development code fallback", async () => {
  const handler = createRequestEmailCodeHandler({
    nodeEnv: "development",
    now: () => 1_000,
    getRetryAfter: () => 0,
    createVerification: () => "481205",
    removeVerification: () => undefined,
    sendEmail: null
  });

  const response = await handler(request("player@example.com"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.devCode, "481205");
  assert.equal(body.retryAfter, 60);
});
