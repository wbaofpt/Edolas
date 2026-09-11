import { createHash, randomBytes } from "node:crypto";

export { CONTROL_CHALLENGE_COOKIE, CONTROL_CSRF_COOKIE, CONTROL_SESSION_COOKIE } from "./constants.ts";
export const CONTROL_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const CONTROL_ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;

export function hashControlSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function secret() {
  return randomBytes(32).toString("base64url");
}

export function createControlCredentials() {
  const token = secret();
  const csrfToken = secret();
  return { token, csrfToken, tokenHash: hashControlSecret(token), csrfHash: hashControlSecret(csrfToken) };
}

export function createControlChallengeSecret() {
  const token = secret();
  return { token, tokenHash: hashControlSecret(token) };
}

export function isControlSessionActive(session: { lastUsedAt: Date; expiresAt: Date }, now = new Date()) {
  return session.expiresAt.getTime() > now.getTime() && session.lastUsedAt.getTime() + CONTROL_IDLE_TIMEOUT_MS > now.getTime();
}

export function controlCookieOptions(expires?: Date) {
  return { httpOnly: true as const, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", ...(expires ? { expires } : {}) };
}
