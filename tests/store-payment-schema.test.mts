import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("store payment migration defines idempotent attempts and events", async () => {
  const source = await readFile(new URL("../lib/store/schema.ts", import.meta.url), "utf8");
  assert.match(source, /CREATE_STORE_PAYMENT_ATTEMPTS_SQL/);
  assert.match(source, /CREATE_STORE_PAYMENT_EVENTS_SQL/);
  assert.match(source, /client_request_key/);
  assert.match(source, /store_order_user_request_unique/);
  assert.match(source, /UNIQUE KEY store_payment_provider_order_unique/);
  assert.match(source, /UNIQUE KEY store_payment_event_unique/);
  assert.match(source, /sandbox_token_hash/);
});
