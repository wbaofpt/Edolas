import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { canManageUsers } from "../admin/authorization.ts";
import { getPool } from "../db.ts";
import { isFreshMinecraftSnapshot } from "./public-status.ts";

type GroupAdminDb = Pick<Pool, "getConnection">;
type GroupAdminConnection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;
type GroupServerRow = { server_id: string; last_seen_at: Date | string };

export type DeleteMinecraftGroupResult =
  | { ok: true; group: string; deletedServers: number }
  | { ok: false; status: 403 | 404 | 409; error: string };

export async function deleteOfflineMinecraftGroup(
  actor: PublicUser,
  groupKey: string,
  db: GroupAdminDb = getPool(),
  now = new Date()
): Promise<DeleteMinecraftGroupResult> {
  if (!canManageUsers(actor.roleName)) {
    return { ok: false, status: 403, error: "Bạn không có quyền xóa dữ liệu cụm máy chủ." };
  }

  const connection = await db.getConnection() as GroupAdminConnection;
  let transactionStarted = false;
  try {
    // The indexed group range must stay stable while telemetry may create backends concurrently.
    await connection.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE", []);
    await connection.beginTransaction();
    transactionStarted = true;
    const [rows] = await connection.query(
      "SELECT server_id,last_seen_at FROM minecraft_servers WHERE group_key=? ORDER BY server_id FOR UPDATE",
      [groupKey]
    ) as [GroupServerRow[], unknown];

    if (rows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return { ok: false, status: 404, error: "Cụm máy chủ không tồn tại." };
    }

    const hasActiveServer = rows.some((row) => isFreshMinecraftSnapshot(new Date(row.last_seen_at), now));
    if (hasActiveServer) {
      await connection.rollback();
      transactionStarted = false;
      return { ok: false, status: 409, error: "Cụm vừa hoạt động trở lại nên không thể xóa." };
    }

    const serverIds = rows.map((row) => row.server_id);
    const placeholders = serverIds.map(() => "?").join(",");
    await connection.execute(`DELETE FROM minecraft_telemetry_nonces WHERE server_id IN (${placeholders})`, serverIds);
    await connection.execute("DELETE FROM minecraft_servers WHERE group_key=?", [groupKey]);
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [actor.id, "minecraft.group.delete", "minecraft_group", groupKey, `Xóa dữ liệu telemetry cụm ${groupKey}`, JSON.stringify({ group: groupKey, serverIds })]
    );
    await connection.commit();
    transactionStarted = false;
    return { ok: true, group: groupKey, deletedServers: serverIds.length };
  } catch (error) {
    if (transactionStarted) await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
