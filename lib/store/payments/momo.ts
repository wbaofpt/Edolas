import { createHmac } from "node:crypto";
import { paymentEventKey, safeEqualHex } from "./crypto.ts";
import type { PaymentProviderAdapter } from "./types.ts";

type MomoConfig = { partnerCode: string; accessKey: string; secretKey: string; endpoint: string };
type Payload = Record<string, unknown>;

export function momoIpnSignature(payload: Payload, accessKey: string) {
  const fields = ["amount", "extraData", "message", "orderId", "orderInfo", "orderType", "partnerCode", "payType", "requestId", "responseTime", "resultCode", "transId"];
  return [`accessKey=${accessKey}`, ...fields.map((key) => `${key}=${String(payload[key] ?? "")}`)].join("&");
}

export function createMomoAdapter(config: MomoConfig, request: typeof fetch = fetch): PaymentProviderAdapter {
  return {
    provider: "momo",
    async createSession(input) {
      const requestId = `${input.reference}-${Date.now()}`;
      const body: Payload = {
        partnerCode: config.partnerCode,
        partnerName: "EdolasSG",
        storeId: "EdolasStore",
        requestId,
        amount: input.amountVnd,
        orderId: input.reference,
        orderInfo: input.description.slice(0, 250),
        redirectUrl: input.returnUrl,
        ipnUrl: input.cancelUrl.replace(/\/store.*$/, "/api/store/payments/momo/ipn"),
        lang: "vi",
        requestType: "captureWallet",
        autoCapture: true,
        extraData: "",
      };
      const raw = `accessKey=${config.accessKey}&amount=${body.amount}&extraData=&ipnUrl=${body.ipnUrl}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&partnerCode=${body.partnerCode}&redirectUrl=${body.redirectUrl}&requestId=${body.requestId}&requestType=captureWallet`;
      body.signature = createHmac("sha256", config.secretKey).update(raw).digest("hex");
      const response = await request(config.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { resultCode?: number; payUrl?: string; qrCodeUrl?: string; deeplink?: string };
      if (!response.ok || result.resultCode !== 0 || !result.payUrl) throw new Error("MoMo could not create a payment session.");
      return { providerOrderId: input.reference, checkoutUrl: result.payUrl, qrContent: result.qrCodeUrl || result.deeplink || result.payUrl, expiresAt: new Date(Date.now() + 15 * 60_000) };
    },
    verifyWebhook(payload) {
      const input = payload && typeof payload === "object" ? payload as Payload : {};
      const signature = typeof input.signature === "string" ? input.signature : "";
      const expected = createHmac("sha256", config.secretKey).update(momoIpnSignature(input, config.accessKey)).digest("hex");
      const valid = String(input.partnerCode ?? "") === config.partnerCode && safeEqualHex(signature, expected);
      const amountVnd = Number.isSafeInteger(Number(input.amount)) ? Number(input.amount) : null;
      const providerOrderId = String(input.orderId ?? "");
      const transactionId = input.transId == null ? null : String(input.transId);
      return {
        valid,
        eventKey: paymentEventKey([providerOrderId, transactionId, amountVnd, String(input.resultCode ?? "")]),
        eventType: "momo.ipn",
        providerOrderId,
        providerTransactionId: transactionId,
        amountVnd,
        paid: valid && Number(input.resultCode) === 0,
        sanitizedPayload: { partnerCode: input.partnerCode, orderId: providerOrderId, transId: transactionId, amount: amountVnd, resultCode: input.resultCode, message: input.message },
        ...(valid ? {} : { reason: "Invalid MoMo signature or partner code." }),
      };
    },
  };
}
