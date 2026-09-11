import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server.js";
import type { PublicUser } from "../auth/service.ts";
import { getRequestUser as resolveUser } from "../community/session-user.ts";
import { recordWikiHeartbeat, recordWikiOpen, WikiPageNotFoundError, type WikiReaderIdentity, type WikiReaderMetrics } from "./readers.ts";

const VISITOR_COOKIE = "edolas_wiki_visitor";
type ReaderAction = (pageId: number, identity: WikiReaderIdentity) => Promise<WikiReaderMetrics>;
type Deps = { getRequestUser?: (request: Request) => Promise<PublicUser | null>; recordOpen?: ReaderAction; recordHeartbeat?: ReaderAction; allowRequest?: (request: Request, pageId: number) => boolean };

function readCookie(request: Request, name: string) {
  const item = request.headers.get("cookie")?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  if (!item) return null;
  try {
    const value = decodeURIComponent(item.slice(name.length + 1));
    return /^[a-f0-9-]{36}$/i.test(value) ? value : null;
  } catch { return null; }
}

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export function createWikiReaderHandler(deps: Deps = {}) {
  const requestBuckets = new Map<string, { count: number; resetAt: number }>();
  function allowRequest(request: Request, pageId: number) {
    if (deps.allowRequest) return deps.allowRequest(request, pageId);
    const address = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!address) return true;
    const key = `${address}:${pageId}`;
    const now = Date.now();
    const bucket = requestBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) { requestBuckets.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
    bucket.count += 1;
    return bucket.count <= 12;
  }
  return async function POST(request: Request, { params }: { params: { id: string } }) {
    const pageId = Number(params.id);
    if (!Number.isInteger(pageId) || pageId < 1) return fail(400, "Mã bài Wiki không hợp lệ.");
    if (!allowRequest(request, pageId)) return fail(429, "Bạn đang gửi trạng thái đọc quá nhanh.");
    const body = await request.json().catch(() => null) as { event?: unknown } | null;
    if (body?.event !== "open" && body?.event !== "heartbeat") return fail(400, "Sự kiện đọc Wiki không hợp lệ.");

    const user = await (deps.getRequestUser ?? resolveUser)(request);
    const existingVisitorId = user ? null : readCookie(request, VISITOR_COOKIE);
    const visitorId = existingVisitorId || randomUUID();
    const identity: WikiReaderIdentity = user ? { userId: user.id } : { visitorId };
    try {
      const action = body.event === "open" ? (deps.recordOpen ?? recordWikiOpen) : (deps.recordHeartbeat ?? recordWikiHeartbeat);
      const metrics = await action(pageId, identity);
      const response = NextResponse.json({ ok: true, metrics });
      if (!user && !existingVisitorId) {
        response.cookies.set(VISITOR_COOKIE, visitorId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
      }
      return response;
    } catch (error) {
      if (error instanceof WikiPageNotFoundError) return fail(404, error.message);
      return fail(503, "Không thể cập nhật trạng thái người đọc lúc này.");
    }
  };
}
