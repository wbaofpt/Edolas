import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "edolas_session";
const DAY_IN_SECONDS = 60 * 60 * 24;
const REMEMBERED_SESSION_SECONDS = DAY_IN_SECONDS * 30;

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  expires: Date;
  maxAge: number;
};

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function issueSession(now = new Date(), remembered = false) {
  const rawToken = randomBytes(32).toString("hex");
  const maxAge = remembered ? REMEMBERED_SESSION_SECONDS : DAY_IN_SECONDS;
  const expiresAt = new Date(now.getTime() + maxAge * 1000);

  return {
    rawToken,
    tokenHash: hashSessionToken(rawToken),
    expiresAt
  };
}

export function getSessionCookieOptions(expiresAt: Date, now = new Date()): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
  };
}
