import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server.js";
import type { PublicUser } from "../auth/service.ts";
import { getRequestUser as resolveUser } from "../community/session-user.ts";
import { saveWikiMediaMetadata, validateWikiMedia } from "../wiki/media.ts";

type Deps = {
  getRequestUser?: (request: Request) => Promise<PublicUser | null>;
  saveMetadata?: typeof saveWikiMediaMetadata;
};

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const MAX_MULTIPART_BYTES = 51 * 1024 * 1024;

export function createForumMediaUploadHandler(deps: Deps = {}) {
  return async function POST(request: Request) {
    const user = await (deps.getRequestUser ?? resolveUser)(request);
    if (!user) return fail(401, "Bạn cần đăng nhập để tải media.");
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) return fail(413, "Tệp tải lên vượt quá 50 MB.");
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail(400, "Vui lòng chọn một tệp media.");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateWikiMedia(bytes.slice(0, 4096), file.size);
    if (!validation.ok) return fail(400, validation.error);
    const fileName = `${Date.now()}-${randomUUID()}.${validation.extension}`;
    const directory = path.join(process.cwd(), "public", "uploads", "forum");
    const diskPath = path.join(directory, fileName);
    const publicPath = `/uploads/forum/${fileName}`;

    try {
      await mkdir(directory, { recursive: true });
      await writeFile(diskPath, bytes, { flag: "wx" });
      const mediaId = await (deps.saveMetadata ?? saveWikiMediaMetadata)({ uploaderId: user.id, pageId: null, kind: validation.kind, path: publicPath, originalName: file.name, mimeType: validation.mimeType, size: file.size });
      return NextResponse.json({ ok: true, media: { id: mediaId, kind: validation.kind, path: publicPath, mimeType: validation.mimeType, size: file.size } }, { status: 201 });
    } catch {
      await unlink(diskPath).catch(() => undefined);
      return fail(503, "Không thể lưu media bài viết lúc này.");
    }
  };
}
