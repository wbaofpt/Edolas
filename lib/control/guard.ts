import { timingSafeEqual } from "node:crypto";
import { CONTROL_CSRF_COOKIE } from "./session.ts";

function cookie(request: Request, name: string) {
  const prefix = `${name}=`;
  const part = request.headers.get("cookie")?.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : "";
}

function same(valueA: string, valueB: string) {
  const a = Buffer.from(valueA); const b = Buffer.from(valueB);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function validateControlMutation(request: Request): { ok: true; csrfToken: string } | { ok: false; status: 403; error: string } {
  const originCheck = validateSameOrigin(request);
  if (!originCheck.ok) return originCheck;
  const csrfCookie = cookie(request, CONTROL_CSRF_COOKIE);
  const csrfHeader = request.headers.get("x-control-csrf") ?? "";
  if (!same(csrfCookie, csrfHeader)) return { ok: false, status: 403, error: "CSRF token không hợp lệ." };
  return { ok: true, csrfToken: csrfHeader };
}

export function validateSameOrigin(request: Request): { ok: true } | { ok: false; status: 403; error: string } {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  if (!origin || !host || origin !== `${proto}://${host}`) return { ok: false, status: 403, error: "Nguồn yêu cầu không hợp lệ." };
  return { ok: true };
}

export function readRequestCookie(request: Request, name: string) {
  return cookie(request, name) || undefined;
}
