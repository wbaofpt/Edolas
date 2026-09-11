import { NextResponse } from "next/server.js";
import { canManageContent, canManageUsers } from "../admin/authorization.ts";
import { applyContentOperation, bulkSetContentTrash } from "../admin/content-operations.ts";
import { deleteForumCategory, saveForumCategory } from "../admin/forum-categories.ts";
import { revokeAdminSession } from "../admin/sessions.ts";
import { parseBulkContentMutation, parseContentOperation } from "../admin/validation.ts";
import { readRequestCookie, validateControlMutation } from "./guard.ts";
import { CONTROL_SESSION_COOKIE } from "./session.ts";
import { resolveControlSession } from "./session-service.ts";

type Resolver = typeof resolveControlSession;
type AccessDeps = { resolveControlSession?: Resolver };
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

async function authorize(request: Request, resolver: Resolver, permission: (role: unknown) => boolean, error: string) {
  const mutation = validateControlMutation(request);
  if (!mutation.ok) return { response: fail(mutation.status, mutation.error) } as const;
  const session = await resolver(readRequestCookie(request, CONTROL_SESSION_COOKIE), { csrfToken: mutation.csrfToken });
  if (!session) return { response: fail(401, "Phiên Control đã hết hạn. Vui lòng xác thực lại.") } as const;
  if (!permission(session.user.roleName)) return { response: fail(403, error) } as const;
  return { user: session.user } as const;
}

export function createControlBulkContentHandler(deps: AccessDeps & { bulkSetContentTrash?: typeof bulkSetContentTrash } = {}) {
  return async (request: Request) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession, canManageContent, "Bạn không có quyền quản lý nội dung.");
    if ("response" in access) return access.response;
    const parsed = parseBulkContentMutation(await request.json().catch(() => null));
    if (!parsed.ok) return fail(400, parsed.error);
    const result = await (deps.bulkSetContentTrash ?? bulkSetContentTrash)(access.user, parsed.value.items, parsed.value.action === "trash");
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  };
}

export function createControlContentOperationHandler(deps: AccessDeps & { applyContentOperation?: typeof applyContentOperation } = {}) {
  return async (request: Request, { params }: { params: { kind: string; id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession, canManageContent, "Bạn không có quyền quản lý nội dung.");
    if ("response" in access) return access.response;
    const kind = params.kind === "forum" || params.kind === "wiki" ? params.kind : null;
    const id = Number(params.id);
    if (!kind || !Number.isInteger(id) || id < 1) return fail(400, "Nội dung không hợp lệ.");
    const parsed = parseContentOperation(kind, await request.json().catch(() => null));
    if (!parsed.ok) return fail(400, parsed.error);
    const result = await (deps.applyContentOperation ?? applyContentOperation)(access.user, kind, id, parsed.value);
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  };
}

export function createControlForumCategoryCollectionHandler(deps: AccessDeps & { saveForumCategory?: typeof saveForumCategory } = {}) {
  return async (request: Request) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession, canManageUsers, "Bạn không có quyền quản lý danh mục.");
    if ("response" in access) return access.response;
    const result = await (deps.saveForumCategory ?? saveForumCategory)(access.user, null, await request.json().catch(() => null));
    return result.ok ? NextResponse.json(result, { status: 201 }) : fail(result.status, result.error);
  };
}

export function createControlForumCategoryItemHandler(deps: AccessDeps & { saveForumCategory?: typeof saveForumCategory; deleteForumCategory?: typeof deleteForumCategory } = {}) {
  return async (request: Request, { params }: { params: { id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession, canManageUsers, "Bạn không có quyền quản lý danh mục.");
    if ("response" in access) return access.response;
    const id = Number(params.id); if (!Number.isInteger(id) || id < 1) return fail(400, "Danh mục không hợp lệ.");
    const result = request.method === "DELETE"
      ? await (deps.deleteForumCategory ?? deleteForumCategory)(access.user, id)
      : await (deps.saveForumCategory ?? saveForumCategory)(access.user, id, await request.json().catch(() => null));
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  };
}

export function createControlSessionItemHandler(deps: AccessDeps & { revokeAdminSession?: typeof revokeAdminSession } = {}) {
  return async (request: Request, { params }: { params: { kind: string; id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession, canManageUsers, "Bạn không có quyền quản lý phiên.");
    if ("response" in access) return access.response;
    const kind = params.kind === "website" || params.kind === "control" ? params.kind : null; const id = Number(params.id);
    if (!kind || !Number.isInteger(id) || id < 1) return fail(400, "Phiên đăng nhập không hợp lệ.");
    const result = await (deps.revokeAdminSession ?? revokeAdminSession)(access.user, kind, id);
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  };
}
