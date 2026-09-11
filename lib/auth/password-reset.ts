import { randomBytes } from "node:crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import { canManageUsers, isProtectedOwner, normalizeAdminRole } from "../admin/authorization.ts";
import type { PublicUser } from "./service.ts";
import { getPool } from "../db.ts";
import { hashControlSecret } from "../control/session.ts";
import { createGmailPasswordResetSenderFromEnv, type PasswordResetEmail } from "./email-sender.ts";
import { hashPassword } from "./password.ts";

type RequestDb = Pick<Pool, "query" | "execute">;
type ConsumeDb = Pick<Pool, "getConnection">;
type Target = { id: number; username: string; email: string | null; role_name: string };
type TokenRow = { id: number; user_id: number; expires_at: Date | string; consumed_at: Date | string | null };
type Connection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;

export function resolvePasswordResetAppUrl(explicit: string | undefined, env: Record<string, string | undefined>) {
  const value = (explicit ?? env.APP_URL)?.trim().replace(/\/$/, "");
  if (value) return value;
  return env.NODE_ENV === "production" ? null : "http://localhost:3000";
}

export async function requestPasswordResetByAdmin(actor: PublicUser, userId: number, deps: { db?: RequestDb; sendEmail?: ((email: PasswordResetEmail) => Promise<void>) | null; makeToken?: () => string; appUrl?: string; now?: Date } = {}) {
  const db = deps.db ?? getPool();
  const now = deps.now ?? new Date();
  const [rows] = await db.query("SELECT id,username,email,role_name FROM users WHERE id=? LIMIT 1", [userId]) as [Target[], unknown];
  const target = rows[0];
  if (!target) return { ok: false as const, status: 404 as const, error: "Không tìm thấy tài khoản." };
  if (!canManageUsers(actor.roleName) || actor.id === target.id || isProtectedOwner({ username: target.username, roleName: target.role_name }) || (normalizeAdminRole(actor.roleName) === "admin" && normalizeAdminRole(target.role_name) === "admin")) return { ok: false as const, status: 403 as const, error: "Bạn không có quyền đặt lại mật khẩu tài khoản này." };
  if (!target.email) return { ok: false as const, status: 409 as const, error: "Tài khoản chưa có email để nhận liên kết." };
  const sender = deps.sendEmail === undefined ? createGmailPasswordResetSenderFromEnv() : deps.sendEmail;
  if (!sender) return { ok: false as const, status: 503 as const, error: "Gmail đặt lại mật khẩu chưa được cấu hình." };
  const token = deps.makeToken?.() ?? randomBytes(32).toString("base64url");
  const tokenHash = hashControlSecret(token);
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
  const appUrl = resolvePasswordResetAppUrl(deps.appUrl, process.env);
  if (!appUrl) return { ok: false as const, status: 503 as const, error: "APP_URL chưa được cấu hình cho email đặt lại mật khẩu." };
  await db.execute("UPDATE password_reset_tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL", [now, userId]);
  await db.execute("INSERT INTO password_reset_tokens (user_id,token_hash,requested_by,expires_at) VALUES (?,?,?,?)", [userId, tokenHash, actor.id, expiresAt]);
  try {
    await sender({ to: target.email, url: `${appUrl}/reset-password?token=${encodeURIComponent(token)}` });
  } catch {
    await db.execute("DELETE FROM password_reset_tokens WHERE token_hash=?", [tokenHash]);
    return { ok: false as const, status: 503 as const, error: "Không thể gửi email đặt lại mật khẩu." };
  }
  await db.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary) VALUES (?,?,?,?,?)", [actor.id, "user.password-reset.request", "user", String(userId), `Gửi liên kết đặt lại mật khẩu cho @${target.username}`]);
  return { ok: true as const };
}

export async function consumePasswordReset(token: string, password: string, deps: { db?: ConsumeDb; now?: Date } = {}) {
  if (password.length < 8) return { ok: false as const, status: 400 as const, error: "Mật khẩu mới phải có ít nhất 8 ký tự." };
  if (!token) return { ok: false as const, status: 400 as const, error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." };
  const db = deps.db ?? getPool();
  const now = deps.now ?? new Date();
  const connection = await db.getConnection() as Connection;
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query("SELECT id,user_id,expires_at,consumed_at FROM password_reset_tokens WHERE token_hash=? LIMIT 1 FOR UPDATE", [hashControlSecret(token)]) as [TokenRow[], unknown];
    const row = rows[0];
    if (!row || row.consumed_at || new Date(row.expires_at).getTime() <= now.getTime()) {
      await connection.rollback();
      return { ok: false as const, status: 400 as const, error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." };
    }
    await connection.execute("UPDATE users SET password_hash=? WHERE id=?", [hashPassword(password), row.user_id]);
    await connection.execute("UPDATE password_reset_tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL", [now, row.user_id]);
    await connection.execute("DELETE FROM auth_sessions WHERE user_id=?", [row.user_id]);
    await connection.execute("DELETE FROM control_sessions WHERE user_id=?", [row.user_id]);
    await connection.commit();
    return { ok: true as const };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
