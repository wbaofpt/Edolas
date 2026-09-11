import {
  MINECRAFT_SERVER_ID_PATTERN,
  parseTelemetryGroups,
  parseTelemetryKeys,
} from "../minecraft/config.ts";
import {
  createCanonicalRequest,
  verifyTelemetrySignature,
} from "../minecraft/protocol.ts";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "../minecraft/request-body.ts";
import {
  claimStoreDelivery,
  completeStoreDelivery,
  StoreDeliveryAuthError,
  StoreDeliveryReplayError,
} from "./delivery.ts";

const NONCE = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_BODY = 16 * 1024;
type Deps = {
  now?: () => Date;
  nodeEnv?: string;
  resolveKeys?: () => ReadonlyMap<string, Buffer>;
  resolveGroups?: () => ReadonlyMap<string, string>;
  claim?: typeof claimStoreDelivery;
  complete?: typeof completeStoreDelivery;
};
const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
function secure(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  return (
    (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https"
  );
}

export function createStoreDeliveryHandler(deps: Deps = {}) {
  return async function POST(request: Request) {
    if (
      (deps.nodeEnv ?? process.env.NODE_ENV) === "production" &&
      !secure(request)
    )
      return json(401, { ok: false, error: "Delivery authentication failed." });
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return json(400, { ok: false, error: "Delivery body must be JSON." });
    const serverId = request.headers.get("x-edolas-server-id")?.trim() ?? "",
      timestamp = request.headers.get("x-edolas-timestamp")?.trim() ?? "",
      nonce = request.headers.get("x-edolas-nonce")?.trim() ?? "",
      signature = request.headers.get("x-edolas-signature")?.trim() ?? "";
    const now = (deps.now ?? (() => new Date()))();
    const timestampMs = Number(timestamp) * 1000;
    if (
      !MINECRAFT_SERVER_ID_PATTERN.test(serverId) ||
      !/^\d{10,13}$/.test(timestamp) ||
      !NONCE.test(nonce) ||
      !signature ||
      !Number.isSafeInteger(timestampMs) ||
      Math.abs(now.getTime() - timestampMs) > 60_000
    )
      return json(401, { ok: false, error: "Delivery authentication failed." });
    let rawBody: string;
    try {
      rawBody = await readRequestBody(request, MAX_BODY);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return json(413, { ok: false, error: "Delivery body is too large." });
      }
      return json(400, { ok: false, error: "Delivery body is invalid." });
    }
    let keys: ReadonlyMap<string, Buffer>;
    let groups: ReadonlyMap<string, string>;
    try {
      keys = (deps.resolveKeys ?? (() => parseTelemetryKeys(process.env)))();
      groups = (
        deps.resolveGroups ?? (() => parseTelemetryGroups(process.env))
      )();
    } catch {
      return json(500, {
        ok: false,
        error: "Delivery service is not configured.",
      });
    }
    const secret = keys.get(serverId);
    const expectedGroup = groups.get(serverId);
    if (
      !secret ||
      !expectedGroup ||
      !verifyTelemetrySignature({
        canonical: createCanonicalRequest({
          serverId,
          timestamp,
          nonce,
          rawBody,
        }),
        signature,
        secret,
      })
    )
      return json(401, { ok: false, error: "Delivery authentication failed." });
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      body = parsed;
    } catch {
      return json(400, { ok: false, error: "Delivery body is invalid." });
    }
    try {
      if (body.schemaVersion !== 1)
        return json(400, {
          ok: false,
          error: "Delivery schema is unsupported.",
        });
      if (body.action === "claim") {
        const delivery = await (deps.claim ?? claimStoreDelivery)({
          serverId,
          nonce,
          now,
          expectedGroup,
        });
        return delivery
          ? json(200, { ok: true, delivery })
          : new Response(null, {
              status: 204,
              headers: { "Cache-Control": "no-store" },
            });
      }
      if (body.action === "complete") {
        const deliveryId = Number(body.deliveryId),
          claimToken =
            typeof body.claimToken === "string" ? body.claimToken : "",
          output = typeof body.output === "string" ? body.output : "";
        if (
          !Number.isSafeInteger(deliveryId) ||
          deliveryId < 1 ||
          !/^[A-Za-z0-9_-]{32,64}$/.test(claimToken) ||
          typeof body.success !== "boolean" ||
          output.length > 500
        )
          return json(400, {
            ok: false,
            error: "Delivery completion is invalid.",
          });
        await (deps.complete ?? completeStoreDelivery)({
          serverId,
          nonce,
          deliveryId,
          claimToken,
          success: body.success,
          output,
          now,
        });
        return json(202, { ok: true });
      }
      return json(400, { ok: false, error: "Delivery action is invalid." });
    } catch (error) {
      if (error instanceof StoreDeliveryReplayError)
        return json(409, {
          ok: false,
          error: "Delivery request was already used.",
        });
      if (error instanceof StoreDeliveryAuthError)
        return json(401, {
          ok: false,
          error: "Delivery authentication failed.",
        });
      return json(500, { ok: false, error: "Delivery operation failed." });
    }
  };
}
