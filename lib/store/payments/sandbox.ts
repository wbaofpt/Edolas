import { randomBytes } from "node:crypto";
import type { PaymentProviderAdapter } from "./types.ts";
import { paymentEventKey } from "./crypto.ts";

export function createSandboxAdapter(
  now = new Date(),
  appPublicUrl = "http://localhost:3000",
): PaymentProviderAdapter {
  return {
    provider: "sandbox",
    async createSession(input) {
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(now.getTime() + 15 * 60_000);
      return {
        providerOrderId: input.reference,
        checkoutUrl: `${appPublicUrl}/api/store/payments/sandbox/${token}/complete`,
        qrContent: `EDOLAS-SANDBOX|KHONG-CHUYEN-TIEN|${input.reference}|${input.amountVnd}|${token}`,
        expiresAt,
        sandboxCompletionToken: token,
      };
    },
    verifyWebhook(payload) {
      return {
        valid: false,
        eventKey: paymentEventKey(["sandbox", JSON.stringify(payload)]),
        eventType: "sandbox.unsupported",
        providerOrderId: "",
        providerTransactionId: null,
        amountVnd: null,
        paid: false,
        sanitizedPayload: {},
        reason: "Sandbox completion uses its one-time token endpoint.",
      };
    },
  };
}
