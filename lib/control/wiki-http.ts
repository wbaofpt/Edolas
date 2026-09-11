import { NextResponse } from "next/server.js";
import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { canManageContent } from "../admin/authorization.ts";
import { getPool } from "../db.ts";
import {
  createWikiClusterItemHandler,
  createWikiClusterPostHandler,
  createWikiPageItemHandler,
  createWikiPagePostHandler
} from "../wiki/http.ts";
import { createWikiMediaUploadHandler as createLegacyWikiMediaUploadHandler } from "../wiki/media-http.ts";
import { saveWikiMediaMetadata } from "../wiki/media.ts";
import {
  createWikiCluster,
  createWikiPage,
  deleteWikiCluster,
  deleteWikiPage,
  updateWikiCluster,
  updateWikiPage
} from "../wiki/service.ts";
import { readRequestCookie, validateControlMutation } from "./guard.ts";
import { CONTROL_SESSION_COOKIE } from "./session.ts";
import { resolveControlSession } from "./session-service.ts";

type Resolver = typeof resolveControlSession;
type Audit = (actor: PublicUser, action: string, targetType: string, targetId: string | null) => Promise<void>;
type MutationDb = Pick<Pool, "getConnection">;
type Connection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;
type BaseDeps = { resolveControlSession?: Resolver; recordAudit?: Audit; db?: MutationDb };
type ClusterDeps = BaseDeps & {
  createWikiCluster?: typeof createWikiCluster;
  updateWikiCluster?: typeof updateWikiCluster;
  deleteWikiCluster?: typeof deleteWikiCluster;
};
type PageDeps = BaseDeps & {
  createWikiPage?: typeof createWikiPage;
  updateWikiPage?: typeof updateWikiPage;
  deleteWikiPage?: typeof deleteWikiPage;
};
type MediaDeps = BaseDeps & { saveMetadata?: typeof saveWikiMediaMetadata };

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

async function authorize(request: Request, resolver: Resolver) {
  const mutation = validateControlMutation(request);
  if (!mutation.ok) return { response: fail(mutation.status, mutation.error) } as const;
  const session = await resolver(readRequestCookie(request, CONTROL_SESSION_COOKIE), { csrfToken: mutation.csrfToken });
  if (!session) return { response: fail(401, "Phiên Control đã hết hạn. Vui lòng xác thực lại.") } as const;
  if (!canManageContent(session.user.roleName)) return { response: fail(403, "Bạn không có quyền quản trị Wiki.") } as const;
  return { user: session.user } as const;
}

export async function recordWikiAudit(actor: PublicUser, action: string, targetType: string, targetId: string | null, db: Pick<Pool, "execute"> = getPool()) {
  await db.execute(
    "INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, summary) VALUES (?, ?, ?, ?, ?)",
    [actor.id, action, targetType, targetId, `${action} ${targetId ? `#${targetId}` : ""}`.trim()]
  );
}

async function transactionalWikiResponse(db: MutationDb, actor: PublicUser, action: string, targetType: string, fallbackId: string | null, operation: (connection: Connection) => Promise<Response>) {
  const connection = await db.getConnection() as Connection;
  await connection.beginTransaction();
  try {
    const response = await operation(connection);
    if (!response.ok) { await connection.rollback(); return response; }
    await auditSuccessfulResponse(response, actor, (user, auditAction, type, id) => recordWikiAudit(user, auditAction, type, id, connection), action, targetType, fallbackId);
    await connection.commit();
    return response;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function auditSuccessfulResponse(response: Response, actor: PublicUser, audit: Audit, action: string, targetType: string, fallbackId: string | null = null) {
  if (!response.ok) return response;
  const body = await response.clone().json().catch(() => ({})) as { id?: number; pageId?: number; media?: { id?: number } };
  const targetId = body.id ?? body.pageId ?? body.media?.id ?? fallbackId;
  await audit(actor, action, targetType, targetId === null ? null : String(targetId));
  return response;
}

export function createControlWikiClusterPostHandler(deps: ClusterDeps = {}) {
  return async (request: Request) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    if (!deps.createWikiCluster && !deps.recordAudit) return transactionalWikiResponse(deps.db ?? getPool(), access.user, "wiki.cluster.create", "wiki_cluster", null, async (connection) => createWikiClusterPostHandler({ getRequestUser: async () => access.user, createWikiCluster: (input) => createWikiCluster(input, connection) })(request) as Promise<Response>);
    const response = await createWikiClusterPostHandler({ getRequestUser: async () => access.user, createWikiCluster: deps.createWikiCluster })(request) as Response;
    return auditSuccessfulResponse(response, access.user, deps.recordAudit ?? recordWikiAudit, "wiki.cluster.create", "wiki_cluster");
  };
}

export function createControlWikiClusterItemHandler(deps: ClusterDeps = {}) {
  return async (request: Request, context: { params: { id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    if (!deps.updateWikiCluster && !deps.deleteWikiCluster && !deps.recordAudit) {
      const action = request.method === "DELETE" ? "wiki.cluster.delete" : "wiki.cluster.update";
      return transactionalWikiResponse(deps.db ?? getPool(), access.user, action, "wiki_cluster", context.params.id, async (connection) => createWikiClusterItemHandler({ getRequestUser: async () => access.user, updateWikiCluster: (id, input) => updateWikiCluster(id, input, connection), deleteWikiCluster: (id) => deleteWikiCluster(id, connection) })(request, context) as Promise<Response>);
    }
    const response = await createWikiClusterItemHandler({ getRequestUser: async () => access.user, updateWikiCluster: deps.updateWikiCluster, deleteWikiCluster: deps.deleteWikiCluster })(request, context) as Response;
    const action = request.method === "DELETE" ? "wiki.cluster.delete" : "wiki.cluster.update";
    return auditSuccessfulResponse(response, access.user, deps.recordAudit ?? recordWikiAudit, action, "wiki_cluster", context.params.id);
  };
}

export function createControlWikiPagePostHandler(deps: PageDeps = {}) {
  return async (request: Request) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    if (!deps.createWikiPage && !deps.recordAudit) return transactionalWikiResponse(deps.db ?? getPool(), access.user, "wiki.page.create", "wiki_page", null, async (connection) => createWikiPagePostHandler({ getRequestUser: async () => access.user, createWikiPage: (authorId, input) => createWikiPage(authorId, input, connection) })(request) as Promise<Response>);
    const response = await createWikiPagePostHandler({ getRequestUser: async () => access.user, createWikiPage: deps.createWikiPage })(request) as Response;
    return auditSuccessfulResponse(response, access.user, deps.recordAudit ?? recordWikiAudit, "wiki.page.create", "wiki_page");
  };
}

export function createControlWikiPageItemHandler(deps: PageDeps = {}) {
  return async (request: Request, context: { params: { id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    if (!deps.updateWikiPage && !deps.deleteWikiPage && !deps.recordAudit) {
      const action = request.method === "DELETE" ? "wiki.page.delete" : "wiki.page.update";
      return transactionalWikiResponse(deps.db ?? getPool(), access.user, action, "wiki_page", context.params.id, async (connection) => createWikiPageItemHandler({ getRequestUser: async () => access.user, updateWikiPage: (id, input) => updateWikiPage(id, input, connection), deleteWikiPage: (id) => deleteWikiPage(id, connection) })(request, context) as Promise<Response>);
    }
    const response = await createWikiPageItemHandler({ getRequestUser: async () => access.user, updateWikiPage: deps.updateWikiPage, deleteWikiPage: deps.deleteWikiPage ?? deleteWikiPage })(request, context) as Response;
    const action = request.method === "DELETE" ? "wiki.page.delete" : "wiki.page.update";
    return auditSuccessfulResponse(response, access.user, deps.recordAudit ?? recordWikiAudit, action, "wiki_page", context.params.id);
  };
}

export function createControlWikiMediaUploadHandler(deps: MediaDeps = {}) {
  return async (request: Request) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    if (!deps.saveMetadata && !deps.recordAudit) {
      const transactionalMetadata: typeof saveWikiMediaMetadata = async (input) => {
        const connection = await (deps.db ?? getPool()).getConnection() as Connection;
        await connection.beginTransaction();
        try {
          const id = await saveWikiMediaMetadata(input, connection);
          await recordWikiAudit(access.user, "wiki.media.upload", "wiki_media", String(id), connection);
          await connection.commit();
          return id;
        } catch (error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
      };
      return createLegacyWikiMediaUploadHandler({ getRequestUser: async () => access.user, saveMetadata: transactionalMetadata })(request);
    }
    const response = await createLegacyWikiMediaUploadHandler({ getRequestUser: async () => access.user, saveMetadata: deps.saveMetadata })(request);
    return auditSuccessfulResponse(response, access.user, deps.recordAudit ?? recordWikiAudit, "wiki.media.upload", "wiki_media");
  };
}

export function retiredWikiMutation() {
  return NextResponse.json({ ok: false, error: "API quản trị Wiki cũ đã ngừng hoạt động. Hãy dùng Control Center." }, { status: 410 });
}
