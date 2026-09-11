import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";
import { canManageUsers, normalizeAdminRole } from "./authorization.ts";

export type AdminSession = { id: number; kind: "website" | "control"; userId: number; username: string; displayName: string; roleName: string; createdAt: Date | string; lastUsedAt: Date | string; expiresAt: Date | string };
export type SessionFilters = { query?: string; kind?: string };
type Connection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;

export async function listAdminSessions(filters: SessionFilters = {}, db: Pick<Pool, "query"> = getPool()): Promise<AdminSession[]> {
  const params: unknown[] = []; const conditions = ["sessions.expires_at>NOW()"];
  if (filters.query?.trim()) { conditions.push("(u.username LIKE ? OR u.display_name LIKE ?)"); params.push(`%${filters.query.trim()}%`, `%${filters.query.trim()}%`); }
  if (filters.kind === "website" || filters.kind === "control") { conditions.push("sessions.kind=?"); params.push(filters.kind); }
  const [rows] = await db.query(`SELECT sessions.id,sessions.kind,sessions.user_id,u.username,u.display_name,u.role_name,sessions.created_at,sessions.last_used_at,sessions.expires_at FROM (SELECT id,'website' kind,user_id,created_at,last_used_at,expires_at FROM auth_sessions UNION ALL SELECT id,'control' kind,user_id,created_at,last_used_at,expires_at FROM control_sessions) sessions INNER JOIN users u ON u.id=sessions.user_id WHERE ${conditions.join(" AND ")} ORDER BY sessions.last_used_at DESC LIMIT 300`, params) as [Array<Record<string, unknown>>, unknown];
  return rows.map((row) => ({ id: Number(row.id), kind: row.kind as "website" | "control", userId: Number(row.user_id), username: String(row.username), displayName: String(row.display_name), roleName: String(row.role_name), createdAt: row.created_at as Date | string, lastUsedAt: row.last_used_at as Date | string, expiresAt: row.expires_at as Date | string }));
}

export async function revokeAdminSession(actor: PublicUser, kind: "website" | "control", sessionId: number, db: Pick<Pool, "getConnection"> = getPool()) {
  if (!canManageUsers(actor.roleName)) return { ok: false as const, status: 403 as const, error: "Bạn không có quyền quản lý phiên." };
  const connection = await db.getConnection() as Connection; await connection.beginTransaction();
  try {
    const table = kind === "website" ? "auth_sessions" : "control_sessions";
    const [rows] = await connection.query(`SELECT u.id,u.username,u.role_name FROM ${table} s INNER JOIN users u ON u.id=s.user_id WHERE s.id=? LIMIT 1 FOR UPDATE`, [sessionId]) as [Array<{ id: number; username: string; role_name: string }>, unknown];
    const target = rows[0];
    if (!target) { await connection.rollback(); return { ok: false as const, status: 404 as const, error: "Phiên đăng nhập không tồn tại." }; }
    const actorRole = normalizeAdminRole(actor.roleName); const targetRole = normalizeAdminRole(target.role_name);
    if (target.id === actor.id || targetRole === "owner" || (actorRole === "admin" && targetRole === "admin")) { await connection.rollback(); return { ok: false as const, status: 403 as const, error: "Bạn không thể thu hồi phiên này." }; }
    await connection.execute(`DELETE FROM ${table} WHERE id=?`, [sessionId]);
    await connection.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)", [actor.id,"session.revoke","session",`${kind}:${sessionId}`,`Thu hồi phiên ${kind} của @${target.username}`,JSON.stringify({ kind, sessionId, userId: target.id })]);
    await connection.commit(); return { ok: true as const };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
