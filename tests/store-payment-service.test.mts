import test from "node:test";
import assert from "node:assert/strict";
import { createStoreCheckout, processVerifiedPayment } from "../lib/store/payments/service.ts";

const user = { id: 7, username: "member", displayName: "Member", roleName: "player", avatarUrl: null };
const sandbox = { mode: "sandbox", sandboxAllowDelivery: false, appPublicUrl: "http://localhost:3000", payos: null, momo: null } as const;

test("checkout retry returns the existing order and payment attempt", async () => {
  let createCalls = 0;
  const db = {
    query: async (sql: string) => sql.includes("client_request_key")
      ? [[{ id: 4, reference: "EDO-EXISTING01", package_name: "VIP", group_key: "survival", minecraft_username: "QuocBaooo", payment_method: "bank", price_vnd: 50000, order_status: "pending_payment", created_at: new Date("2026-08-14T00:00:00Z"), provider: "sandbox", payment_status: "awaiting_payment", amount_vnd: 50000, checkout_url: null, qr_content: "SANDBOX", expires_at: new Date("2026-08-14T00:15:00Z") }], undefined]
      : [[], undefined],
    execute: async () => [{}, undefined],
    getConnection: async () => { throw new Error("not expected"); },
  };
  const result = await createStoreCheckout(user, { packageId: 1, minecraftUsername: "QuocBaooo", paymentMethod: "bank", clientRequestKey: "abcdefghijklmnop" }, {
    db: db as never,
    config: sandbox,
    createOrder: async () => { createCalls += 1; throw new Error("not expected"); },
  });
  assert.equal(result.ok, true);
  assert.equal(createCalls, 0);
  if (result.ok) assert.equal(result.payment.reference, "EDO-EXISTING01");
});

test("verified payment queues one idempotent command delivery", async () => {
  const statements: string[] = [];
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined,
    query: async () => [[{ id: 3, order_id: 9, amount_vnd: 50000, status: "awaiting_payment", command_template_snapshot: "lp user {player} parent add vip", package_slug: "vip", price_vnd: 50000, group_key: "survival", minecraft_username: "QuocBaooo" }], undefined],
    execute: async (sql: string) => { statements.push(sql); return [{ insertId: 1 }, undefined]; },
  };
  const result = await processVerifiedPayment("payos", { valid: true, paid: true, eventKey: "a".repeat(64), eventType: "payos.webhook", providerOrderId: "123", providerTransactionId: "tx-1", amountVnd: 50000, sanitizedPayload: { code: "00" } }, true, { getConnection: async () => connection } as never);
  assert.equal(result.ok, true);
  assert.equal(statements.filter((sql) => sql.includes("store_command_deliveries")).length, 1);
  assert.match(statements.find((sql) => sql.includes("store_command_deliveries")) ?? "", /INSERT IGNORE/);
});
