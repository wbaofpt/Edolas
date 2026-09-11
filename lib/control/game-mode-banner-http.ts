import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server.js";
import { canManageSettings } from "../admin/authorization.ts";
import { readRequestCookie, validateControlMutation } from "./guard.ts";
import { GAME_MODE_BANNER_LIMIT_BYTES, updateGameModeBanner, validateGameModeBanner, type GameModeBannerValidation } from "./game-mode-banner.ts";
import { CONTROL_SESSION_COOKIE } from "./session.ts";
import { resolveControlSession } from "./session-service.ts";

type Resolver = typeof resolveControlSession;
type SuccessfulValidation = Extract<GameModeBannerValidation, { ok: true }>;
type WriteBanner = (file: File, bytes: Uint8Array, validation: SuccessfulValidation) => Promise<{ publicPath: string; diskPath: string }>;
type RemoveFile = (diskPath: string) => Promise<void>;
type Deps = {
  resolveControlSession?: Resolver;
  updateGameModeBanner?: typeof updateGameModeBanner;
  writeBanner?: WriteBanner;
  removeFile?: RemoveFile;
};

const MAX_MULTIPART_BYTES = 9 * 1024 * 1024;
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

function managedDiskPath(publicPath: string | null) {
  if (!publicPath || !/^\/uploads\/game-modes\/[a-zA-Z0-9._-]+$/.test(publicPath)) return null;
  return path.join(process.cwd(), "public", "uploads", "game-modes", path.basename(publicPath));
}

async function writeManagedBanner(_file: File, bytes: Uint8Array, validation: SuccessfulValidation) {
  const directory = path.join(process.cwd(), "public", "uploads", "game-modes");
  const fileName = `${Date.now()}-${randomUUID()}.${validation.extension}`;
  const diskPath = path.join(directory, fileName);
  await mkdir(directory, { recursive: true });
  await writeFile(diskPath, bytes, { flag: "wx" });
  return { publicPath: `/uploads/game-modes/${fileName}`, diskPath };
}

async function authorize(request: Request, resolver: Resolver) {
  const mutation = validateControlMutation(request);
  if (!mutation.ok) return { response: fail(mutation.status, mutation.error) } as const;
  const session = await resolver(readRequestCookie(request, CONTROL_SESSION_COOKIE), { csrfToken: mutation.csrfToken });
  if (!session) return { response: fail(401, "Phiên Control đã hết hạn.") } as const;
  if (!canManageSettings(session.user.roleName)) return { response: fail(403, "Bạn không có quyền quản lý banner chế độ chơi.") } as const;
  return { user: session.user } as const;
}

export function createGameModeBannerHandler(deps: Deps = {}) {
  const removeFile = deps.removeFile ?? unlink;
  const updateBanner = deps.updateGameModeBanner ?? updateGameModeBanner;

  return async (request: Request, { params }: { params: { id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    const gameModeId = Number(params.id);
    if (!Number.isInteger(gameModeId) || gameModeId < 1) return fail(400, "Chế độ chơi không hợp lệ.");

    if (request.method === "DELETE") {
      try {
        const result = await updateBanner(access.user, gameModeId, null);
        if (!result.ok) return fail(result.status, result.error);
        const previousDiskPath = managedDiskPath(result.previousPath);
        if (previousDiskPath) await removeFile(previousDiskPath).catch(() => undefined);
        return NextResponse.json({ ok: true, bannerPath: null });
      } catch {
        return fail(503, "Không thể gỡ ảnh banner lúc này.");
      }
    }

    if (request.method !== "POST") return fail(405, "Phương thức không được hỗ trợ.");
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) return fail(413, "Ảnh tải lên vượt quá giới hạn 8 MB.");
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail(400, "Vui lòng chọn một ảnh banner.");
    if (file.size > GAME_MODE_BANNER_LIMIT_BYTES) return fail(413, "Ảnh banner không được vượt quá 8 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateGameModeBanner(bytes.slice(0, 16), file.size);
    if (!validation.ok) return fail(400, validation.error);

    let stored: { publicPath: string; diskPath: string } | null = null;
    try {
      stored = await (deps.writeBanner ?? writeManagedBanner)(file, bytes, validation);
      const result = await updateBanner(access.user, gameModeId, stored.publicPath);
      if (!result.ok) {
        await removeFile(stored.diskPath).catch(() => undefined);
        return fail(result.status, result.error);
      }
      const previousDiskPath = managedDiskPath(result.previousPath);
      if (previousDiskPath && result.previousPath !== stored.publicPath) await removeFile(previousDiskPath).catch(() => undefined);
      return NextResponse.json({ ok: true, bannerPath: stored.publicPath }, { status: 201 });
    } catch {
      if (stored) await removeFile(stored.diskPath).catch(() => undefined);
      return fail(503, "Không thể lưu ảnh banner lúc này.");
    }
  };
}
