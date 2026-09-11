import { createHmac } from "node:crypto";
import { paymentEventKey, safeEqualHex } from "./crypto.ts";
import type { PaymentProviderAdapter } from "./types.ts";

type PayosConfig = { clientId: string; apiKey: string; checksumKey: string };

function scalar(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function payosSignature(data: Record<string, unknown>, checksumKey: string) {
  const canonical = Object.keys(data).sort().map((key) => `${key}=${scalar(data[key])}`).join("&");
  return createHmac("sha256", checksumKey).update(canonical).digest("hex");
}

function numericOrderCode(reference: string) {
  const digest = createHmac("sha256", "edolas-payos-order-code").update(reference).digest();
  return Number(BigInt(`0x${digest.subarray(0, 6).toString("hex")}`) % 9_000_000_000_000n + 1_000_000_000_000n);
}

export function createPayosAdapter(config: PayosConfig, request: typeof fetch = fetch): PaymentProviderAdapter {
  return {
    provider: "payos",
    async createSession(input) {
      const orderCode = numericOrderCode(input.reference);
      const data = {
        orderCode,
        amount: input.amountVnd,
        description: input.reference.slice(0, 25),
        cancelUrl: input.cancelUrl,
        returnUrl: input.returnUrl,
      };
      const response = await request("https://api-merchant.payos.vn/v2/payment-requests", {
        method: "POST",
        headers: { "content-type": "application/json", "x-client-id": config.clientId, "x-api-key": config.apiKey },
        body: JSON.stringify({ ...data, signature: payosSignature(data, config.checksumKey) }),
      });
      const body = await response.json() as { code?: string; data?: { checkoutUrl?: string; qrCode?: string; paymentLinkId?: string } };
      if (!response.ok || body.code !== "00" || !body.data?.qrCode) throw new Error("payOS could not create a payment link.");
      return {
        providerOrderId: String(orderCode),
        checkoutUrl: body.data.checkoutUrl || null,
        qrContent: body.data.qrCode,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      };
    },
    verifyWebhook(payload) {
      const input = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      const data = input.data && typeof input.data === "object" ? input.data as Record<string, unknown> : {};
      const signature = typeof input.signature === "string" ? input.signature : "";
      const valid = safeEqualHex(signature, payosSignature(data, config.checksumKey));
      const providerOrderId = String(data.paymentLinkId ?? data.orderCode ?? "");
      const transactionId = data.reference == null ? null : String(data.reference);
      const amountVnd = Number.isSafeInteger(Number(data.amount)) ? Number(data.amount) : null;
      return {
        valid,
        eventKey: paymentEventKey([providerOrderId, transactionId, amountVnd, String(data.code ?? "")]),
        eventType: "payos.webhook",
        providerOrderId,
        providerTransactionId: transactionId,
        amountVnd,
        paid: valid && input.success === true && String(data.code ?? "00") === "00",
        sanitizedPayload: { success: input.success === true, orderCode: data.orderCode, paymentLinkId: data.paymentLinkId, amount: amountVnd, code: data.code },
        ...(valid ? {} : { reason: "Invalid payOS signature." }),
      };
    },
  };
}
