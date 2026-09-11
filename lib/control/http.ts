import { NextResponse } from "next/server.js";
import type { PublicUser } from "../auth/service.ts";
import { canAccessAdmin } from "../admin/authorization.ts";
import { getRequestUser as resolveWebsiteUser } from "../community/session-user.ts";
import { beginControlAccess, verifyControlOtp } from "./access.ts";
import { readRequestCookie, validateControlMutation, validateSameOrigin } from "./guard.ts";
import { CONTROL_CHALLENGE_COOKIE, CONTROL_CSRF_COOKIE, CONTROL_SESSION_COOKIE, controlCookieOptions } from "./session.ts";
import { deleteControlSession, resolveControlSession } from "./session-service.ts";

type PasswordDeps = { getRequestUser?: (request: Request) => Promise<PublicUser | null>; beginControlAccess?: typeof beginControlAccess };
type OtpDeps = { verifyControlOtp?: typeof verifyControlOtp };
type LogoutDeps = { deleteControlSession?: typeof deleteControlSession; resolveControlSession?: typeof resolveControlSession };
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export function createControlPasswordHandler(deps: PasswordDeps = {}) {
  return async (request: Request) => {
    const origin = validateSameOrigin(request);
    if (!origin.ok) return fail(origin.status, origin.error);
    const user = await (deps.getRequestUser ?? resolveWebsiteUser)(request);
    if (!user) return fail(401, "Bạn cần đăng nhập website trước.");
    if (!canAccessAdmin(user.roleName)) return fail(403, "Tài khoản không có quyền Control.");
    const body = await request.json().catch(() => null) as { password?: string } | null;
    if (!body?.password) return fail(400, "Vui lòng nhập mật khẩu.");
    const result = await (deps.beginControlAccess ?? beginControlAccess)(user.id, body.password);
    if (!result.ok) return fail(result.status, result.error);
    const response = NextResponse.json({ ok: true, emailHint: result.emailHint });
    response.cookies.set(CONTROL_CHALLENGE_COOKIE, result.challengeToken, controlCookieOptions(new Date(Date.now() + 10 * 60 * 1000)));
    return response;
  };
}

export function createControlOtpHandler(deps: OtpDeps = {}) {
  return async (request: Request) => {
    const origin = validateSameOrigin(request);
    if (!origin.ok) return fail(origin.status, origin.error);
    const challenge = readRequestCookie(request, CONTROL_CHALLENGE_COOKIE);
    const body = await request.json().catch(() => null) as { code?: string } | null;
    if (!challenge || !body?.code) return fail(400, "Mã hoặc phiên xác minh không hợp lệ.");
    const result = await (deps.verifyControlOtp ?? verifyControlOtp)(challenge, body.code);
    if (!result.ok) return fail(result.status, result.error);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CONTROL_SESSION_COOKIE, result.token, controlCookieOptions(result.expiresAt));
    response.cookies.set(CONTROL_CSRF_COOKIE, result.csrfToken, { httpOnly: false, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", expires: result.expiresAt });
    response.cookies.set(CONTROL_CHALLENGE_COOKIE, "", { ...controlCookieOptions(new Date(0)), maxAge: 0 });
    return response;
  };
}

export function createControlLogoutHandler(deps: LogoutDeps = {}) {
  return async (request: Request) => {
    const mutation = validateControlMutation(request);
    if (!mutation.ok) return fail(mutation.status, mutation.error);
    const token = readRequestCookie(request, CONTROL_SESSION_COOKIE);
    const session = await (deps.resolveControlSession ?? resolveControlSession)(token, { csrfToken: mutation.csrfToken });
    if (!session) return fail(401, "Phiên Control đã hết hạn.");
    await (deps.deleteControlSession ?? deleteControlSession)(token);
    const response = NextResponse.json({ ok: true });
    for (const name of [CONTROL_SESSION_COOKIE, CONTROL_CSRF_COOKIE]) {
      response.cookies.set(name, "", { ...controlCookieOptions(new Date(0)), httpOnly: name === CONTROL_SESSION_COOKIE, maxAge: 0 });
    }
    return response;
  };
}
