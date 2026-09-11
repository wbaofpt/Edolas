import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createSandboxAdapter } from "../lib/store/payments/sandbox.ts";
import { createPayosAdapter, payosSignature } from "../lib/store/payments/payos.ts";
import { createMomoAdapter, momoIpnSignature } from "../lib/store/payments/momo.ts";

const input = {
  reference: "EDO-ABC1234567",
  amountVnd: 50000,
  description: "VIP Survival",
  returnUrl: "https://edolas.test/store?payment=EDO-ABC1234567",
  cancelUrl: "https://edolas.test/store?cancelled=EDO-ABC1234567",
};

test("sandbox creates a local, expiring QR session", async () => {
  const session = await createSandboxAdapter(new Date("2026-08-14T00:00:00Z")).createSession(input);
  assert.match(session.qrContent, /SANDBOX/);
  assert.match(session.checkoutUrl ?? "", /\/api\/store\/payments\/sandbox\//);
  assert.ok(session.sandboxCompletionToken);
  assert.equal(session.expiresAt.toISOString(), "2026-08-14T00:15:00.000Z");
});

test("payOS webhook signature is verified before accepting payment", () => {
  const data = { orderCode: 123, amount: 50000, reference: input.reference, code: "00" };
  const signature = payosSignature(data, "checksum-secret");
  const adapter = createPayosAdapter({ clientId: "client", apiKey: "api", checksumKey: "checksum-secret" });
  assert.equal(adapter.verifyWebhook({ success: true, data, signature }).valid, true);
  assert.equal(adapter.verifyWebhook({ success: true, data: { ...data, amount: 1 }, signature }).valid, false);
});

test("MoMo IPN signature and amount are normalized", () => {
  const payload = { partnerCode: "MOMO", orderId: input.reference, requestId: "req", amount: 50000, orderInfo: "VIP", orderType: "momo_wallet", transId: 99, resultCode: 0, message: "Successful.", payType: "qr", responseTime: 1, extraData: "" };
  const raw = momoIpnSignature(payload, "access");
  const signature = createHmac("sha256", "secret").update(raw).digest("hex");
  const adapter = createMomoAdapter({ partnerCode: "MOMO", accessKey: "access", secretKey: "secret", endpoint: "https://test-payment.momo.vn/v2/gateway/api/create" });
  const verified = adapter.verifyWebhook({ ...payload, signature });
  assert.equal(verified.valid, true);
  assert.equal(verified.paid, true);
  assert.equal(verified.amountVnd, 50000);
});
