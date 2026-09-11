import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";
import { isProtectedOwner, normalizeAdminRole } from "./authorization.ts";

type DeactivationDb = Pick<Pool, "getConnection">;
type Connection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;
type Target = { id: number; username: string; display_name: string; role_name: string; account_status: string; locked_at: Date | string | null; disabled_forever: boolean | number };
export type DeactivationInput = { duration: "days"; days: number; reason: string } | { duration: "forever"; reason: string };
type AccessState = { accountStatus: string; disabledForever: boolean; disabledUntil: Date | string | null };

export function isUserAccessActive(state: AccessState, now = new Date()) {
  if (state.accountStatus === "locked" || state.disabledForever) return false;
  if (state.accountStatus === "disabled") return Boolean(state.disabledUntil && new Date(state.disabledUntil).getTime() <= now.getTime());
  return state.accountStatus === "active";
}

export async function setUserDeactivation(actor: PublicUser, userId: number, input: DeactivationInput | null, db: DeactivationDb = getPool(), now = new Date()) {
  const connection = await db.getConnection() as Connection;
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query("SELECT id,username,display_name,role_name,account_status,locked_at,disabled_forever FROM users WHERE id=? LIMIT 1 FOR UPDATE", [userId]) as [Target[], unknown];
    const target = rows[0];
    if (!target) { await connection.rollback(); return { ok: false as const, status: 404 as const, error: "Không tìm thấy tài khoản." }; }
    if (isProtectedOwner({ username: target.username, roleName: target.role_name }) || actor.id === target.id) { await connection.rollback(); return { ok: false as const, status: 403 as const, error: "Không thể thay đổi tài khoản này." }; }
    const actorRole = normalizeAdminRole(actor.roleName);
    if (actorRole !== "owner" && normalizeAdminRole(target.role_name) === "admin") { await connection.rollback(); return { ok: false as const, status: 403 as const, error: "Admin không thể quản lý một Admin khác." }; }
    if (input?.duration === "forever" && actorRole !== "owner") { await connection.rollback(); return { ok: false as const, status: 403 as const, error: "Chỉ Owner có thể vô hiệu hóa vĩnh viễn." }; }
    if (!input && Boolean(target.disabled_forever) && actorRole !== "owner") { await connection.rollback(); return { ok: false as const, status: 403 as const, error: "Chỉ Owner có thể kích hoạt lại tài khoản bị vô hiệu hóa vĩnh viễn." }; }

    const disabledForever = input?.duration === "forever";
    const disabledUntil = input?.duration === "days" ? new Date(now.getTime() + input.days * 86400000) : null;
    await connection.execute(
      "UPDATE users SET account_status=?,disabled_until=?,disabled_forever=?,disabled_by=?,disabled_reason=? WHERE id=?",
      [target.locked_at ? "locked" : input ? "disabled" : "active", disabledUntil, disabledForever, input ? actor.id : null, input?.reason ?? null, userId]
    );
    if (input) {
      await connection.execute("DELETE FROM auth_sessions WHERE user_id=?", [userId]);
      await connection.execute("DELETE FROM control_sessions WHERE user_id=?", [userId]);
    }
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [actor.id, input ? "user.deactivate" : "user.reactivate", "user", String(userId), `${input ? "Vô hiệu hóa" : "Kích hoạt lại"} tài khoản @${target.username}`, JSON.stringify(input ?? {})]
    );
    await connection.commit();
    return { ok: true as const, disabledUntil, disabledForever };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
