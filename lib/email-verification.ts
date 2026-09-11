import { randomInt } from "crypto";

type VerificationRecord = { code: string; expiresAt: number; requestedAt: number; verified: boolean };
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_COOLDOWN_MS = 60 * 1000;
const globalStore = globalThis as typeof globalThis & { edolasEmailVerification?: Map<string, VerificationRecord> };
const records = globalStore.edolasEmailVerification ?? new Map<string, VerificationRecord>();
globalStore.edolasEmailVerification = records;

export function createVerification(email: string, now = Date.now()) {
  const code = String(randomInt(100000, 1000000));
  records.set(email.toLowerCase(), { code, expiresAt: now + VERIFICATION_TTL_MS, requestedAt: now, verified: false });
  return code;
}

export function getVerificationRetryAfter(email: string, now = Date.now()) {
  const record = records.get(email.toLowerCase());
  if (!record) return 0;
  return Math.max(0, Math.ceil((record.requestedAt + VERIFICATION_COOLDOWN_MS - now) / 1000));
}

export function removeVerification(email: string) {
  records.delete(email.toLowerCase());
}

export function isEmailVerified(email: string) {
  const record = records.get(email.toLowerCase());
  return Boolean(record?.verified && record.expiresAt >= Date.now());
}

export function consumeVerification(email: string) {
  removeVerification(email);
}

export function verifyCode(email: string, code: string) {
  const record = records.get(email.toLowerCase());
  if (!record || record.expiresAt < Date.now() || record.code !== code) return false;
  record.verified = true;
  return true;
}
