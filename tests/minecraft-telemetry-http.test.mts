import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createTelemetryRouteHandler } from "../lib/minecraft/telemetry-http.ts";
import { createCanonicalRequest } from "../lib/minecraft/protocol.ts";
import { ReplayTelemetryError } from "../lib/minecraft/repository.ts";

const now = new Date("2026-08-13T12:00:00.000Z");
const secret = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
const payload = {
  schemaVersion: 1,
  reportedAt: now.toISOString(),
  server: {
    id: "survival-01",
    group: "survival",
    displayName: "Survival 01",
    minecraftVersion: "1.21.1",
    paperVersion: "1.21.1-123",
    startedAt: "2026-08-13T10:00:00.000Z",
    uptimeSeconds: 7200,
  },
  capacity: { online: 0, max: 100 },
  performance: {
    tps1m: 20,
    tps5m: 19.9,
    tps15m: 19.8,
    mspt: 12.5,
    memoryUsedBytes: 1024,
    memoryMaxBytes: 4096,
  },
  worlds: [{ name: "world", players: 0, loadedChunks: 120 }],
  players: [],
  pluginHealth: [{ name: "LuckPerms", version: "5.4.0", enabled: true }],
};

function signedRequest(
  options: {
    timestamp?: number;
    nonce?: string;
    body?: string;
    signature?: string;
    contentLength?: string;
    serverId?: string;
    signingSecret?: Buffer;
  } = {},
) {
  const body = options.body ?? JSON.stringify(payload);
  const timestamp = String(
    options.timestamp ?? Math.floor(now.getTime() / 1000),
  );
  const nonce = options.nonce ?? "nonce-1234567890abcdef";
  const serverId = options.serverId ?? "survival-01";
  const canonical = createCanonicalRequest({
    serverId,
    timestamp,
    nonce,
    rawBody: body,
  });
  const signature =
    options.signature ??
    `v1=${createHmac("sha256", options.signingSecret ?? secret)
      .update(canonical)
      .digest("hex")}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Edolas-Server-Id": serverId,
    "X-Edolas-Timestamp": timestamp,
    "X-Edolas-Nonce": nonce,
    "X-Edolas-Signature": signature,
  };
  if (options.contentLength) headers["Content-Length"] = options.contentLength;
  return new Request("https://edolas.test/api/minecraft/telemetry", {
    method: "POST",
    headers,
    body,
  });
}

test("signed telemetry request is validated before persistence", async () => {
  let savedServer = "";
  const handler = createTelemetryRouteHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: () => new Map([["survival-01", "survival"]]),
    saveSnapshot: async (input) => {
      savedServer = input.snapshot.server.id;
      return { acceptedAt: now };
    },
  });

  const response = await handler(signedRequest());
  assert.equal(response.status, 202);
  assert.equal(savedServer, "survival-01");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("telemetry route rejects bad signatures, stale timestamps and oversized bodies", async () => {
  const handler = createTelemetryRouteHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: () => new Map([["survival-01", "survival"]]),
    saveSnapshot: async () => ({ acceptedAt: now }),
  });
  assert.equal(
    (await handler(signedRequest({ signature: `v1=${"0".repeat(64)}` })))
      .status,
    401,
  );
  assert.equal(
    (
      await handler(
        signedRequest({ timestamp: Math.floor(now.getTime() / 1000) - 61 }),
      )
    ).status,
    401,
  );
  assert.equal(
    (await handler(signedRequest({ contentLength: String(256 * 1024 + 1) })))
      .status,
    413,
  );
});

test("a backend key cannot authenticate telemetry for another backend", async () => {
  const otherSecret = Buffer.from("abcdef0123456789abcdef0123456789", "utf8");
  const otherPayload = JSON.stringify({
    ...payload,
    server: {
      ...payload.server,
      id: "survival-02",
      displayName: "Survival 02",
    },
  });
  const handler = createTelemetryRouteHandler({
    now: () => now,
    resolveKeys: () =>
      new Map([
        ["survival-01", secret],
        ["survival-02", otherSecret],
      ]),
    resolveGroups: () =>
      new Map([
        ["survival-01", "survival"],
        ["survival-02", "survival"],
      ]),
    saveSnapshot: async () => ({ acceptedAt: now }),
  });
  const response = await handler(
    signedRequest({
      serverId: "survival-02",
      body: otherPayload,
      signingSecret: secret,
    }),
  );
  assert.equal(response.status, 401);
});

test("a signed backend cannot move itself to another cluster", async () => {
  const movedPayload = JSON.stringify({
    ...payload,
    server: { ...payload.server, group: "op-skyblock" },
  });
  const handler = createTelemetryRouteHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: () => new Map([["survival-01", "survival"]]),
    saveSnapshot: async () => ({ acceptedAt: now }),
  });
  assert.equal(
    (await handler(signedRequest({ body: movedPayload }))).status,
    401,
  );
});

test("telemetry route maps nonce replay without exposing persistence details", async () => {
  const handler = createTelemetryRouteHandler({
    now: () => now,
    resolveKeys: () => new Map([["survival-01", secret]]),
    resolveGroups: () => new Map([["survival-01", "survival"]]),
    saveSnapshot: async () => {
      throw new ReplayTelemetryError();
    },
  });
  const response = await handler(signedRequest());
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Telemetry request was already used.",
  });
});
