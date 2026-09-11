import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server.js";
import type { PublicUser } from "../auth/service.ts";
import { getRequestUser as resolveRequestUser } from "../community/session-user.ts";
import { getProfileByUsername, toggleFollow, updateAvatarPath, updateOwnProfile } from "./service.ts";
import { parseProfileUpdate, validateAvatarBytes } from "./validation.ts";

type RouteContext = { params: { username: string } };

type ProfileHttpDeps = {
  getRequestUser?: (request: Request) => Promise<PublicUser | null>;
  updateOwnProfile?: (userId: number, displayName: string, bio: string) => Promise<void>;
  updateAvatarPath?: (userId: number, avatarUrl: string) => Promise<string | null>;
  getProfileByUsername?: typeof getProfileByUsername;
  toggleFollow?: typeof toggleFollow;
};

function errorResponse(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function createProfileUpdateHandler(deps: ProfileHttpDeps = {}) {
  const getRequestUser = deps.getRequestUser ?? resolveRequestUser;
  const saveProfile = deps.updateOwnProfile ?? updateOwnProfile;

  return async function PATCH(request: Request) {
    const user = await getRequestUser(request);
    if (!user) return errorResponse(401, "Bạn cần đăng nhập để sửa hồ sơ.");

    const parsed = parseProfileUpdate(await request.json().catch(() => null));
    if (!parsed.ok) return errorResponse(400, parsed.error);

    try {
      await saveProfile(user.id, parsed.value.displayName, parsed.value.bio);
      return NextResponse.json({ ok: true, profile: parsed.value });
    } catch {
      return errorResponse(503, "Không thể cập nhật hồ sơ lúc này.");
    }
  };
}

export function createFollowHandler(deps: ProfileHttpDeps = {}) {
  const getRequestUser = deps.getRequestUser ?? resolveRequestUser;
  const findProfile = deps.getProfileByUsername ?? getProfileByUsername;
  const changeFollow = deps.toggleFollow ?? toggleFollow;

  return async function POST(request: Request, context: RouteContext) {
    const user = await getRequestUser(request);
    if (!user) return errorResponse(401, "Bạn cần đăng nhập để theo dõi thành viên.");

    const profile = await findProfile(decodeURIComponent(context.params.username), user.id);
    if (!profile) return errorResponse(404, "Không tìm thấy tài khoản.");

    const result = await changeFollow(user.id, profile.id);
    if (!result.ok) return errorResponse(result.status, result.error);
    return NextResponse.json(result);
  };
}

export function createAvatarUploadHandler(deps: ProfileHttpDeps = {}) {
  const getRequestUser = deps.getRequestUser ?? resolveRequestUser;
  const saveAvatar = deps.updateAvatarPath ?? updateAvatarPath;

  return async function POST(request: Request) {
    const user = await getRequestUser(request);
    if (!user) return errorResponse(401, "Bạn cần đăng nhập để đổi ảnh đại diện.");

    const formData = await request.formData().catch(() => null);
    const avatar = formData?.get("avatar");
    if (!(avatar instanceof File)) return errorResponse(400, "Vui lòng chọn một tệp ảnh.");

    const buffer = new Uint8Array(await avatar.arrayBuffer());
    const validation = validateAvatarBytes(buffer.slice(0, 12), avatar.size);
    if (!validation.ok) return errorResponse(400, validation.error);

    const fileName = `${user.id}-${randomUUID()}.${validation.extension}`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "avatars");
    const diskPath = path.join(uploadDirectory, fileName);
    const publicPath = `/uploads/avatars/${fileName}`;

    try {
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(diskPath, buffer, { flag: "wx" });
      const previousPath = await saveAvatar(user.id, publicPath);

      if (previousPath?.startsWith("/uploads/avatars/") && previousPath !== publicPath) {
        const previousFile = path.basename(previousPath);
        await unlink(path.join(uploadDirectory, previousFile)).catch(() => undefined);
      }

      return NextResponse.json({ ok: true, avatarUrl: publicPath });
    } catch {
      await unlink(diskPath).catch(() => undefined);
      return errorResponse(503, "Không thể lưu ảnh đại diện lúc này.");
    }
  };
}

