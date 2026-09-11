import type { PublicUser } from "../../auth/service.ts";
import { getRequestUser as resolveRequestUser } from "../../community/session-user.ts";
import { validateSameOrigin } from "../../control/guard.ts";
import { readStorePaymentConfig } from "./config.ts";
import { createMomoAdapter } from "./momo.ts";
import { createPayosAdapter } from "./payos.ts";
import { completeSandboxPayment, getOwnedPayment, processVerifiedPayment } from "./service.ts";

type UserResolver = (request: Request) => Promise<PublicUser | null>;
const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function body(request: Request) {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 64 * 1024) return null;
  const text = await request.text();
  if (text.length > 64 * 1024) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
}

export function createPaymentStatusHandler(deps: { getUser?: UserResolver; getPayment?: typeof getOwnedPayment } = {}) {
  return async (request: Request, { params }: { params: { reference: string } }) => {
    const user = await (deps.getUser ?? resolveRequestUser)(request);
    if (!user) return json(401, { ok: false, error: "Bạn cần đăng nhập." });
    const payment = await (deps.getPayment ?? getOwnedPayment)(params.reference, user.id);
    return payment ? json(200, { ok: true, payment }) : json(404, { ok: false, error: "Không tìm thấy giao dịch." });
  };
}

export function createPayosWebhookHandler() {
  return async (request: Request) => {
    const config = readStorePaymentConfig();
    if (config.mode !== "live" || !config.payos) return json(503, { success: false });
    const payload = await body(request);
    if (!payload) return json(400, { success: false });
    const verified = createPayosAdapter(config.payos).verifyWebhook(payload);
    const result = await processVerifiedPayment("payos", verified);
    return json(result.ok ? 200 : 400, { success: result.ok });
  };
}

export function createMomoIpnHandler() {
  return async (request: Request) => {
    const config = readStorePaymentConfig();
    if (config.mode !== "live" || !config.momo) return json(503, { resultCode: 99 });
    const payload = await body(request);
    if (!payload) return json(400, { resultCode: 99 });
    const verified = createMomoAdapter(config.momo).verifyWebhook(payload);
    const result = await processVerifiedPayment("momo", verified);
    return result.ok
      ? new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
      : json(400, { resultCode: 99 });
  };
}

export function createSandboxCompleteHandler(deps: { complete?: typeof completeSandboxPayment } = {}) {
  return async (request: Request, { params }: { params: { token: string } }) => {
    const origin = validateSameOrigin(request);
    if (!origin.ok) return json(origin.status, { ok: false, error: origin.error });
    const result = await (deps.complete ?? completeSandboxPayment)(params.token);
    return result.ok ? json(200, { ok: true, simulated: true }) : json(result.status, { ok: false, error: result.error });
  };
}
