import { NextResponse } from "next/server.js";
import { createAdminContentHandler, createAdminSettingsHandler, createAdminUserHandler } from "../admin/http.ts";
import { permanentlyDeleteContent, revokeUserSessions, setContentTrashState, setUserLock, setUserRole, updateSiteSettings } from "../admin/service.ts";
import { setUserDeactivation } from "../admin/deactivation.ts";
import { requestPasswordResetByAdmin } from "../auth/password-reset.ts";
import { readRequestCookie, validateControlMutation } from "./guard.ts";
import { CONTROL_SESSION_COOKIE } from "./session.ts";
import { resolveControlSession } from "./session-service.ts";

type Resolver = typeof resolveControlSession;
type UserDeps = { resolveControlSession?: Resolver; setUserLock?: typeof setUserLock; setUserRole?: typeof setUserRole; revokeUserSessions?: typeof revokeUserSessions; setUserDeactivation?: typeof setUserDeactivation; requestPasswordResetByAdmin?: typeof requestPasswordResetByAdmin };
type ContentDeps = { resolveControlSession?: Resolver; setContentTrashState?: typeof setContentTrashState; permanentlyDeleteContent?: typeof permanentlyDeleteContent };
type SettingsDeps = { resolveControlSession?: Resolver; updateSiteSettings?: typeof updateSiteSettings };

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

async function authorize(request: Request, resolver: Resolver) {
  const mutation = validateControlMutation(request);
  if (!mutation.ok) return { response: fail(mutation.status, mutation.error) } as const;
  const session = await resolver(readRequestCookie(request, CONTROL_SESSION_COOKIE), { csrfToken: mutation.csrfToken });
  if (!session) return { response: fail(401, "Phiên Control đã hết hạn. Vui lòng xác thực lại.") } as const;
  return { user: session.user } as const;
}

export function createControlAdminUserHandler(deps: UserDeps = {}) {
  return async (request: Request, context: { params: { id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    return createAdminUserHandler({ getRequestUser: async () => access.user, setUserLock: deps.setUserLock, setUserRole: deps.setUserRole, revokeUserSessions: deps.revokeUserSessions, setUserDeactivation: deps.setUserDeactivation, requestPasswordResetByAdmin: deps.requestPasswordResetByAdmin })(request, context);
  };
}

export function createControlAdminContentHandler(deps: ContentDeps = {}) {
  return async (request: Request, context: { params: { kind: string; id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    return createAdminContentHandler({ getRequestUser: async () => access.user, setContentTrashState: deps.setContentTrashState, permanentlyDeleteContent: deps.permanentlyDeleteContent })(request, context);
  };
}

export function createControlAdminSettingsHandler(deps: SettingsDeps = {}) {
  return async (request: Request) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    return createAdminSettingsHandler({ getRequestUser: async () => access.user, updateSiteSettings: deps.updateSiteSettings })(request);
  };
}

export function retiredAdminMutation() {
  return NextResponse.json({ ok: false, error: "API quản trị cũ đã ngừng hoạt động. Hãy dùng Control Center." }, { status: 410 });
}
