import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function createCanonicalRequest({ serverId, timestamp, nonce, rawBody }: { serverId: string; timestamp: string; nonce: string; rawBody: string }) {
  const bodyHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  return `v1\n${serverId}\n${timestamp}\n${nonce}\n${bodyHash}`;
}

export function verifyTelemetrySignature({ canonical, signature, secret }: { canonical: string; signature: string; secret: Buffer }) {
  if (!/^v1=[a-f0-9]{64}$/.test(signature)) return false;
  const supplied = Buffer.from(signature.slice(3), "hex");
  const expected = createHmac("sha256", secret).update(canonical, "utf8").digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
