import {
  MINECRAFT_SERVER_ID_PATTERN,
  parseTelemetryGroups,
  parseTelemetryKeys,
} from "./config.ts";
import {
  createCanonicalRequest,
  verifyTelemetrySignature,
} from "./protocol.ts";
import { readRequestBody, RequestBodyTooLargeError } from "./request-body.ts";
import {
  RateLimitedTelemetryError,
  ReplayTelemetryError,
  saveTelemetrySnapshot,
} from "./repository.ts";
import type { TelemetrySnapshot } from "./types.ts";
import { parseTelemetryPayload } from "./validation.ts";

const MAX_BODY_BYTES = 256 * 1024;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

type SaveInput = {
  serverId: string;
  nonce: string;
  snapshot: TelemetrySnapshot;
  now: Date;
};

type TelemetryRouteDeps = {
  now?: () => Date;
  nodeEnv?: string;
  resolveKeys?: () => ReadonlyMap<string, Buffer>;
  resolveGroups?: () => ReadonlyMap<string, string>;
  saveSnapshot?: (input: SaveInput) => Promise<{ acceptedAt: Date }>;
};

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isSecureRequest(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  return forwarded
    ? forwarded === "https"
    : new URL(request.url).protocol === "https:";
}

export function createTelemetryRouteHandler(deps: TelemetryRouteDeps = {}) {
  const now = deps.now ?? (() => new Date());
  const resolveKeys =
    deps.resolveKeys ?? (() => parseTelemetryKeys(process.env));
  const resolveGroups =
    deps.resolveGroups ?? (() => parseTelemetryGroups(process.env));
  const persist =
    deps.saveSnapshot ?? ((input) => saveTelemetrySnapshot(input));

  return async function handleTelemetry(request: Request) {
    if (
      (deps.nodeEnv ?? process.env.NODE_ENV) === "production" &&
      !isSecureRequest(request)
    ) {
      return json(401, {
        ok: false,
        error: "Telemetry authentication failed.",
      });
    }
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return json(400, { ok: false, error: "Telemetry body must be JSON." });
    }

    const serverId = request.headers.get("x-edolas-server-id")?.trim() ?? "";
    const timestamp = request.headers.get("x-edolas-timestamp")?.trim() ?? "";
    const nonce = request.headers.get("x-edolas-nonce")?.trim() ?? "";
    const signature = request.headers.get("x-edolas-signature")?.trim() ?? "";
    if (
      !MINECRAFT_SERVER_ID_PATTERN.test(serverId) ||
      !/^\d{10,13}$/.test(timestamp) ||
      !NONCE_PATTERN.test(nonce) ||
      !signature
    ) {
      return json(401, {
        ok: false,
        error: "Telemetry authentication failed.",
      });
    }

    const receivedAt = now();
    const timestampMs = Number(timestamp) * 1_000;
    if (
      !Number.isSafeInteger(timestampMs) ||
      Math.abs(receivedAt.getTime() - timestampMs) > 60_000
    ) {
      return json(401, {
        ok: false,
        error: "Telemetry authentication failed.",
      });
    }

    let keys: ReadonlyMap<string, Buffer>;
    let groups: ReadonlyMap<string, string>;
    try {
      keys = resolveKeys();
      groups = resolveGroups();
    } catch {
      return json(500, {
        ok: false,
        error: "Telemetry service is not configured.",
      });
    }
    const secret = keys.get(serverId);
    const expectedGroup = groups.get(serverId);
    if (!secret || !expectedGroup)
      return json(401, {
        ok: false,
        error: "Telemetry authentication failed.",
      });

    let rawBody: string;
    try {
      rawBody = await readRequestBody(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return json(413, {
          ok: false,
          error: "Telemetry payload is too large.",
        });
      }
      return json(400, { ok: false, error: "Telemetry body is invalid." });
    }
    const canonical = createCanonicalRequest({
      serverId,
      timestamp,
      nonce,
      rawBody,
    });
    if (!verifyTelemetrySignature({ canonical, signature, secret })) {
      return json(401, {
        ok: false,
        error: "Telemetry authentication failed.",
      });
    }

    let snapshot: TelemetrySnapshot;
    try {
      snapshot = parseTelemetryPayload(JSON.parse(rawBody));
    } catch {
      return json(400, { ok: false, error: "Telemetry payload is invalid." });
    }
    if (
      snapshot.server.id !== serverId ||
      snapshot.server.group !== expectedGroup
    ) {
      return json(401, {
        ok: false,
        error: "Telemetry authentication failed.",
      });
    }

    try {
      const result = await persist({
        serverId,
        nonce,
        snapshot,
        now: receivedAt,
      });
      return json(202, {
        ok: true,
        acceptedAt: result.acceptedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ReplayTelemetryError)
        return json(409, {
          ok: false,
          error: "Telemetry request was already used.",
        });
      if (error instanceof RateLimitedTelemetryError)
        return json(429, {
          ok: false,
          error: "Telemetry is arriving too quickly.",
        });
      return json(500, { ok: false, error: "Telemetry could not be stored." });
    }
  };
}
