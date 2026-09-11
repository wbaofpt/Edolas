import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";

export type GameModeBannerValidation =
  | { ok: true; extension: "jpg" | "png" | "webp"; mimeType: "image/jpeg" | "image/png" | "image/webp" }
  | { ok: false; error: string };

type BannerDb = Pick<Pool, "getConnection">;
type BannerConnection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;
export const GAME_MODE_BANNER_LIMIT_BYTES = 8 * 1024 * 1024;

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function validateGameModeBanner(bytes: Uint8Array, size: number): GameModeBannerValidation {
  let match: Extract<GameModeBannerValidation, { ok: true }> | null = null;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    match = { ok: true, extension: "png", mimeType: "image/png" };
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    match = { ok: true, extension: "jpg", mimeType: "image/jpeg" };
  } else if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    match = { ok: true, extension: "webp", mimeType: "image/webp" };
  }
  if (!match) return { ok: false, error: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ." };
  if (size < 4 || size > GAME_MODE_BANNER_LIMIT_BYTES) return { ok: false, error: "Ảnh banner không được vượt quá 8 MB." };
  return match;
}

export async function updateGameModeBanner(
  actor: PublicUser,
  gameModeId: number,
  bannerPath: string | null,
  db: BannerDb = getPool()
) {
  if (bannerPath !== null && !/^\/uploads\/game-modes\/[a-zA-Z0-9._-]+$/.test(bannerPath)) {
    return { ok: false as const, status: 400 as const, error: "Đường dẫn banner không hợp lệ." };
  }
  const connection = await db.getConnection() as BannerConnection;
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query(
      "SELECT id,banner_path FROM game_modes WHERE id=? AND deleted_at IS NULL LIMIT 1 FOR UPDATE",
      [gameModeId]
    ) as [Array<{ id: number; banner_path: string | null }>, unknown];
    const current = rows[0];
    if (!current) {
      await connection.rollback();
      return { ok: false as const, status: 404 as const, error: "Không tìm thấy chế độ chơi." };
    }
    await connection.execute("UPDATE game_modes SET banner_path=? WHERE id=?", [bannerPath, gameModeId]);
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [actor.id, bannerPath ? "game-mode.banner.update" : "game-mode.banner.remove", "game-mode", String(gameModeId), bannerPath ? `Cập nhật banner chế độ #${gameModeId}` : `Gỡ banner chế độ #${gameModeId}`, JSON.stringify({ previousPath: current.banner_path, bannerPath })]
    );
    await connection.commit();
    return { ok: true as const, previousPath: current.banner_path, bannerPath };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
