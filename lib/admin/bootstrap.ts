import type { Pool } from "mysql2/promise";
import { hashPassword } from "../auth/password.ts";
import { getPool } from "../db.ts";

type BootstrapDb = Pick<Pool, "execute">;

export async function bootstrapOwner(input: { email: string; password: string }, db: BootstrapDb = getPool()) {
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || input.password.length < 16) {
    return { ok: false as const, error: "Owner email hoặc mật khẩu không hợp lệ; mật khẩu cần ít nhất 16 ký tự." };
  }
  const [result] = await db.execute(
    "UPDATE users SET email = ?, password_hash = ?, email_verified_at = NOW(), role_name = 'owner', account_status = 'active' WHERE username = 'edolas_admin'",
    [email, hashPassword(input.password)]
  );
  if (Number((result as { affectedRows?: number }).affectedRows) !== 1) return { ok: false as const, error: "Không tìm thấy tài khoản edolas_admin. Hãy chạy seed và migration trước." };
  return { ok: true as const };
}
