import test from "node:test";
import assert from "node:assert/strict";
import { readStorePaymentConfig } from "../lib/store/payments/config.ts";

test("payment config defaults to safe sandbox without delivery", () => {
  const config = readStorePaymentConfig({ NODE_ENV: "development" });
  assert.equal(config.mode, "sandbox");
  assert.equal(config.sandboxAllowDelivery, false);
  assert.equal(config.appPublicUrl, "http://localhost:3000");
});

test("production refuses sandbox delivery", () => {
  assert.throws(() => readStorePaymentConfig({
    NODE_ENV: "production",
    STORE_PAYMENT_MODE: "sandbox",
    STORE_SANDBOX_ALLOW_DELIVERY: "true",
  }), /sandbox delivery/i);
});

test("live mode requires a public HTTPS URL and never falls back", () => {
  assert.throws(() => readStorePaymentConfig({
    NODE_ENV: "production",
    STORE_PAYMENT_MODE: "live",
    APP_PUBLIC_URL: "http://localhost:3000",
  }), /HTTPS/);
});
