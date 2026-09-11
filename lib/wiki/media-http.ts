import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server.js";
import type { PublicUser } from "../auth/service.ts";
import { getRequestUser as resolveUser, isStaff } from "../community/session-user.ts";
import { saveWikiMediaMetadata, validateWikiMedia } from "./media.ts";

type Deps = { getRequestUser?: (request: Request) => Promise<PublicUser | null>; saveMetadata?: typeof saveWikiMediaMetadata };
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const MAX_MULTIPART_BYTES = 51 * 1024 * 1024;

export function createWikiMediaUploadHandler(deps: Deps = {}) {
  return async function POST(request: Request) {
    const user = await (deps.getRequestUser ?? resolveUser)(request);
    if (!user) return fail(401, "Bạn cần đăng nhập.");
    if (!isStaff(user)) return fail(403, "Chỉ staff được tải media Wiki.");
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) return fail(413, "Tệp tải lên vượt quá giới hạn 50 MB.");
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail(400, "Vui lòng chọn một tệp media.");
    const pageIdValue = Number(form?.get("pageId"));
    const pageId = Number.isInteger(pageIdValue) && pageIdValue > 0 ? pageIdValue : null;
    const buffer = new Uint8Array(await file.arrayBuffer());
    const validation = validateWikiMedia(buffer.slice(0, 4096), file.size);
    if (!validation.ok) return fail(400, validation.error);
    const fileName = `${Date.now()}-${randomUUID()}.${validation.extension}`;
    const directory = path.join(process.cwd(), "public", "uploads", "wiki");
    const diskPath = path.join(directory, fileName);
    const publicPath = `/uploads/wiki/${fileName}`;
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(diskPath, buffer, { flag: "wx" });
      const mediaId = await (deps.saveMetadata ?? saveWikiMediaMetadata)({ uploaderId: user.id, pageId, kind: validation.kind, path: publicPath, originalName: file.name, mimeType: validation.mimeType, size: file.size });
      return NextResponse.json({ ok: true, media: { id: mediaId, kind: validation.kind, path: publicPath, mimeType: validation.mimeType, size: file.size } }, { status: 201 });
    } catch {
      await unlink(diskPath).catch(() => undefined);
      return fail(503, "Không thể lưu media Wiki lúc này.");
    }
  };
}
