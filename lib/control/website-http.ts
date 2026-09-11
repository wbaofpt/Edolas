import { NextResponse } from "next/server.js";
import { canManageSettings } from "../admin/authorization.ts";
import { readRequestCookie, validateControlMutation } from "./guard.ts";
import { CONTROL_SESSION_COOKIE } from "./session.ts";
import { resolveControlSession } from "./session-service.ts";
import { saveWebsiteResource, setWebsiteResourceTrash, WEBSITE_RESOURCE_KINDS, type WebsiteResourceKind } from "./website-resources.ts";

type Resolver = typeof resolveControlSession;
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

async function actor(request: Request, resolver: Resolver) {
  const mutation = validateControlMutation(request);
  if (!mutation.ok) return { response: fail(mutation.status, mutation.error) } as const;
  const session = await resolver(readRequestCookie(request, CONTROL_SESSION_COOKIE), { csrfToken: mutation.csrfToken });
  if (!session) return { response: fail(401, "Phiên Control đã hết hạn.") } as const;
  if (!canManageSettings(session.user.roleName)) return { response: fail(403, "Bạn không có quyền quản lý dữ liệu website.") } as const;
  return { user: session.user } as const;
}

function kind(value: string) {
  return WEBSITE_RESOURCE_KINDS.find((item) => item === value) as WebsiteResourceKind | undefined;
}

export function createControlWebsiteCollectionHandler(deps: { resolveControlSession?: Resolver; saveWebsiteResource?: typeof saveWebsiteResource } = {}) {
  return async (request: Request, { params }: { params: { kind: string } }) => {
    const access = await actor(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    const resourceKind = kind(params.kind);
    if (!resourceKind) return fail(400, "Loại dữ liệu website không hợp lệ.");
    const result = await (deps.saveWebsiteResource ?? saveWebsiteResource)(access.user, resourceKind, null, await request.json().catch(() => null));
    return result.ok ? NextResponse.json(result, { status: 201 }) : fail(result.status, result.error);
  };
}

export function createControlWebsiteItemHandler(deps: { resolveControlSession?: Resolver; saveWebsiteResource?: typeof saveWebsiteResource; setWebsiteResourceTrash?: typeof setWebsiteResourceTrash } = {}) {
  return async (request: Request, { params }: { params: { kind: string; id: string } }) => {
    const access = await actor(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    const resourceKind = kind(params.kind);
    const id = Number(params.id);
    if (!resourceKind || !Number.isInteger(id) || id < 1) return fail(400, "Dữ liệu website không hợp lệ.");
    const body = await request.json().catch(() => null) as { action?: string; values?: unknown } | null;
    const result = body?.action === "trash" || body?.action === "restore"
      ? await (deps.setWebsiteResourceTrash ?? setWebsiteResourceTrash)(access.user, resourceKind, id, body.action === "trash")
      : body?.action === "save"
        ? await (deps.saveWebsiteResource ?? saveWebsiteResource)(access.user, resourceKind, id, body.values)
        : { ok: false as const, status: 400 as const, error: "Thao tác dữ liệu website không hợp lệ." };
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  };
}
