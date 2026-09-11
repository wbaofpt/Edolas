import { NextResponse } from "next/server.js";
import type { PublicUser } from "../auth/service.ts";
import { getRequestUser as resolveUser } from "../community/session-user.ts";
import { canManageContent, canManageSettings, canManageUsers } from "./authorization.ts";
import {
  CONTENT_KINDS,
  permanentlyDeleteContent,
  revokeUserSessions,
  setContentTrashState,
  setUserLock,
  setUserRole,
  updateSiteSettings
} from "./service.ts";
import { parseContentMutation, parseSettingsMutation, parseUserMutation } from "./validation.ts";
import { setUserDeactivation } from "./deactivation.ts";
import { requestPasswordResetByAdmin } from "../auth/password-reset.ts";

type UserHandlerDeps = { getRequestUser?: (request: Request) => Promise<PublicUser | null>; setUserLock?: typeof setUserLock; setUserRole?: typeof setUserRole; revokeUserSessions?: typeof revokeUserSessions; setUserDeactivation?: typeof setUserDeactivation; requestPasswordResetByAdmin?: typeof requestPasswordResetByAdmin };
type ContentHandlerDeps = { getRequestUser?: (request: Request) => Promise<PublicUser | null>; setContentTrashState?: typeof setContentTrashState; permanentlyDeleteContent?: typeof permanentlyDeleteContent };
type SettingsHandlerDeps = { getRequestUser?: (request: Request) => Promise<PublicUser | null>; updateSiteSettings?: typeof updateSiteSettings };

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

async function body(request: Request) {
  return request.json().catch(() => null);
}

export function createAdminUserHandler(deps: UserHandlerDeps = {}) {
  return async (request: Request, { params }: { params: { id: string } }) => {
    const user = await (deps.getRequestUser ?? resolveUser)(request);
    if (!user) return fail(401, "Bạn cần đăng nhập.");
    if (!canManageUsers(user.roleName)) return fail(403, "Bạn không có quyền quản lý tài khoản.");
    const id = Number(params.id);
    if (!Number.isInteger(id) || id < 1) return fail(400, "Mã tài khoản không hợp lệ.");
    const parsed = parseUserMutation(await body(request));
    if (!parsed.ok) return fail(400, parsed.error);
    const result = parsed.value.action === "lock"
      ? await (deps.setUserLock ?? setUserLock)(user, id, parsed.value.locked, parsed.value.reason)
      : parsed.value.action === "role"
        ? await (deps.setUserRole ?? setUserRole)(user, id, parsed.value.role)
        : parsed.value.action === "deactivate"
          ? await (deps.setUserDeactivation ?? setUserDeactivation)(user, id, parsed.value.duration === "forever"
              ? { duration: "forever", reason: parsed.value.reason }
              : { duration: "days", days: parsed.value.days, reason: parsed.value.reason })
          : parsed.value.action === "reactivate"
            ? await (deps.setUserDeactivation ?? setUserDeactivation)(user, id, null)
            : parsed.value.action === "request-password-reset"
              ? await (deps.requestPasswordResetByAdmin ?? requestPasswordResetByAdmin)(user, id)
              : await (deps.revokeUserSessions ?? revokeUserSessions)(user, id);
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  };
}

export function createAdminContentHandler(deps: ContentHandlerDeps = {}) {
  return async (request: Request, { params }: { params: { kind: string; id: string } }) => {
    const user = await (deps.getRequestUser ?? resolveUser)(request);
    if (!user) return fail(401, "Bạn cần đăng nhập.");
    if (!canManageContent(user.roleName)) return fail(403, "Bạn không có quyền quản lý nội dung.");
    const kind = CONTENT_KINDS.find((item) => item === params.kind);
    const id = Number(params.id);
    if (!kind || !Number.isInteger(id) || id < 1) return fail(400, "Nội dung không hợp lệ.");
    const parsed = parseContentMutation(await body(request));
    if (!parsed.ok) return fail(400, parsed.error);
    if (parsed.value.action === "delete-permanently" && !canManageUsers(user.roleName)) return fail(403, "Chỉ Admin hoặc Owner được xóa vĩnh viễn.");
    const result = parsed.value.action === "delete-permanently"
      ? await (deps.permanentlyDeleteContent ?? permanentlyDeleteContent)(user, kind, id)
      : await (deps.setContentTrashState ?? setContentTrashState)(user, kind, id, parsed.value.action === "trash");
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  };
}

export function createAdminSettingsHandler(deps: SettingsHandlerDeps = {}) {
  return async (request: Request) => {
    const user = await (deps.getRequestUser ?? resolveUser)(request);
    if (!user) return fail(401, "Bạn cần đăng nhập.");
    if (!canManageSettings(user.roleName)) return fail(403, "Bạn không có quyền thay đổi cài đặt.");
    const parsed = parseSettingsMutation(await body(request));
    if (!parsed.ok) return fail(400, parsed.error);
    const result = await (deps.updateSiteSettings ?? updateSiteSettings)(user, parsed.value);
    return NextResponse.json(result);
  };
}
