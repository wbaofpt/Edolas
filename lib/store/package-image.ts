import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";

export const STORE_PACKAGE_IMAGE_LIMIT_BYTES = 5 * 1024 * 1024;
export type StorePackageImageValidation =
  | { ok: true; extension: "jpg" | "png" | "webp"; mimeType: "image/jpeg" | "image/png" | "image/webp" }
  | { ok: false; error: string };

type ImageDb = Pick<Pool, "getConnection">;
type ImageConnection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function validateStorePackageImage(bytes: Uint8Array, size: number): StorePackageImageValidation {
  let match: Extract<StorePackageImageValidation, { ok: true }> | null = null;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    match = { ok: true, extension: "png", mimeType: "image/png" };
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    match = { ok: true, extension: "jpg", mimeType: "image/jpeg" };
  } else if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    match = { ok: true, extension: "webp", mimeType: "image/webp" };
  }
  if (!match) return { ok: false, error: "Chi chap nhan anh JPG, PNG hoac WebP hop le." };
  if (size < 4 || size > STORE_PACKAGE_IMAGE_LIMIT_BYTES) return { ok: false, error: "Anh goi khong duoc vuot qua 5 MB." };
  return match;
}

export async function updateStorePackageImage(
  actor: PublicUser,
  packageId: number,
  imagePath: string | null,
  db: ImageDb = getPool(),
) {
  if (!Number.isSafeInteger(packageId) || packageId < 1) {
    return { ok: false as const, status: 400 as const, error: "Ma goi khong hop le." };
  }
  if (imagePath !== null && !/^\/uploads\/store\/packages\/[a-zA-Z0-9._-]+$/.test(imagePath)) {
    return { ok: false as const, status: 400 as const, error: "Duong dan anh goi khong hop le." };
  }
  const connection = await db.getConnection() as ImageConnection;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT id,image_path FROM store_packages WHERE id=? LIMIT 1 FOR UPDATE",
      [packageId],
    ) as [Array<{ id: number; image_path: string | null }>, unknown];
    const current = rows[0];
    if (!current) {
      await connection.rollback();
      return { ok: false as const, status: 404 as const, error: "Khong tim thay goi nap." };
    }
    await connection.execute("UPDATE store_packages SET image_path=?,updated_by=? WHERE id=?", [imagePath, actor.id, packageId]);
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [actor.id, imagePath ? "store.package.image.update" : "store.package.image.remove", "store_package", String(packageId), imagePath ? `Cap nhat anh goi #${packageId}` : `Go anh goi #${packageId}`, JSON.stringify({ previousPath: current.image_path, imagePath })],
    );
    await connection.commit();
    return { ok: true as const, previousPath: current.image_path, imagePath };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
