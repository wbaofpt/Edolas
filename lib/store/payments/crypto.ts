import { createHash, timingSafeEqual } from "node:crypto";

export function safeEqualHex(actual: string, expected: string) {
  if (!/^[a-f0-9]+$/i.test(actual) || !/^[a-f0-9]+$/i.test(expected)) return false;
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function paymentEventKey(parts: Array<string | number | null>) {
  return createHash("sha256").update(parts.map((part) => String(part ?? "")).join("\u001f")).digest("hex");
}
