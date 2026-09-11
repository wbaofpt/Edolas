export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseProfileUpdate(input: unknown): ValidationResult<{ displayName: string; bio: string }> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dữ liệu hồ sơ không hợp lệ." };
  }

  const body = input as Record<string, unknown>;
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";

  if (displayName.length < 2 || displayName.length > 80) {
    return { ok: false, error: "Tên hiển thị phải có từ 2 đến 80 ký tự." };
  }
  if (bio.length > 500) {
    return { ok: false, error: "Giới thiệu không được vượt quá 500 ký tự." };
  }

  return { ok: true, value: { displayName, bio } };
}

export function validateAvatarBytes(bytes: Uint8Array, size: number): { ok: true; extension: "png" | "jpg" | "webp" } | { ok: false; error: string } {
  if (size < 4 || size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Ảnh đại diện phải nhỏ hơn 3 MB." };
  }

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ok: true, extension: "png" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ok: true, extension: "jpg" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { ok: true, extension: "webp" };
  }

  return { ok: false, error: "Chỉ chấp nhận ảnh PNG, JPG hoặc WebP hợp lệ." };
}

