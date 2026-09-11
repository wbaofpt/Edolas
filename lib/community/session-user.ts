import type { PublicUser } from "../auth/service.ts";
import { getUserBySession } from "../auth/service.ts";
import { SESSION_COOKIE_NAME } from "../auth/session.ts";
import { canManageContent } from "../admin/authorization.ts";

type SessionDependencies = {
  getUserBySession?: (token: string | undefined) => Promise<PublicUser | null>;
};

function readCookie(header: string | null, name: string) {
  if (!header) return undefined;

  const prefix = `${name}=`;
  const part = header.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  if (!part) return undefined;

  const rawValue = part.slice(prefix.length);
  const value = rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue.slice(1, -1) : rawValue;
  return decodeURIComponent(value);
}

export async function getRequestUser(request: Request, deps: SessionDependencies = {}) {
  const resolveUser = deps.getUserBySession ?? getUserBySession;
  return resolveUser(readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME));
}

export function isStaff(user: PublicUser | null): user is PublicUser {
  return Boolean(user && canManageContent(user.roleName));
}
