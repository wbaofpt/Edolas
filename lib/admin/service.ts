import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";
import { canAssignRole, canManageUsers, isProtectedOwner, normalizeAdminRole, type AdminRole } from "./authorization.ts";
import type { EditableSetting } from "./validation.ts";
import { isUserAccessActive } from "./deactivation.ts";

export type AdminDb = Pick<Pool, "query" | "execute" | "getConnection">;
type MutationConnection = Pick<PoolConnection, "beginTransaction" | "commit" | "rollback" | "release" | "query" | "execute">;
type TargetUser = { id: number; username: string; display_name: string; role_name: string; account_status: string; disabled_until: Date | string | null; disabled_forever: boolean | number };
type Failure = { ok: false; status: 403 | 404 | 409; error: string };

export type AdminOverview = {
  users: number;
  activeUsers: number;
  lockedUsers: number;
  activeSessions: number;
  forumTopics: number;
  wikiPages: number;
  mediaFiles: number;
  trashItems: number;
  pinnedTopics: number;
  draftWikiPages: number;
  unattachedMedia: number;
  expiringTrash: number;
};

export type AdminUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  roleName: AdminRole;
  avatarUrl: string | null;
  accountStatus: "active" | "locked" | "disabled";
  disabledUntil: Date | string | null;
  disabledForever: boolean;
  disabledReason: string | null;
  sessions: number;
  posts: number;
  createdAt: Date | string;
};

export type AdminContentItem = {
  id: number;
  kind: ContentKind;
  title: string;
  status: string;
  author: string | null;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  purgeAfter: Date | string | null;
  pinned: boolean;
  categoryId: number | null;
  categoryName: string | null;
  clusterId: number | null;
  clusterName: string | null;
  mediaPath: string | null;
  mediaType: string | null;
  sizeBytes: number | null;
  attachedPage: string | null;
};

export type AdminAuditEntry = { id: number; actor: string | null; action: string; targetType: string; targetId: string | null; summary: string; createdAt: Date | string };
export type SiteSetting = { key: EditableSetting; value: string; group: string; updatedAt: Date | string };
export type AdminContentFilters = { kind?: "all" | ContentKind; trash?: boolean; query?: string; status?: string };
export type AuditFilters = { actor?: string; action?: string; target?: string; from?: string; to?: string };
export const CONTENT_KINDS = ["forum", "wiki", "media"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

const CONTENT_TABLES: Record<ContentKind, string> = { forum: "forum_topics", wiki: "wiki_pages", media: "wiki_media" };
const number = (value: unknown) => Number(value) || 0;

async function audit(connection: Pick<PoolConnection, "execute">, actorId: number, action: string, targetType: string, targetId: number | string, summary: string, metadata?: unknown) {
  await connection.execute(
    "INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, summary, metadata) VALUES (?, ?, ?, ?, ?, ?)",
    [actorId, action, targetType, String(targetId), summary, metadata ? JSON.stringify(metadata) : null]
  );
}

async function targetUser(connection: Pick<PoolConnection, "query">, id: number) {
  const [rows] = await connection.query("SELECT id, username, display_name, role_name, account_status, disabled_until, disabled_forever FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [id]) as [TargetUser[], unknown];
  return rows[0] ?? null;
}

function canManageTarget(actor: PublicUser, target: TargetUser) {
  if (!canManageUsers(actor.roleName) || isProtectedOwner({ username: target.username, roleName: target.role_name })) return false;
  if (normalizeAdminRole(actor.roleName) === "admin" && normalizeAdminRole(target.role_name) === "admin") return false;
  return actor.id !== target.id;
}

async function transaction<T>(db: AdminDb, work: (connection: MutationConnection) => Promise<T>): Promise<T> {
  const connection = await db.getConnection() as MutationConnection;
  await connection.beginTransaction();
  try {
    const result = await work(connection);
    if (result && typeof result === "object" && "ok" in result && result.ok === false) await connection.rollback();
    else await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setUserLock(actor: PublicUser, userId: number, locked: boolean, reason: string, db: AdminDb = getPool(), now = new Date()): Promise<{ ok: true; locked: boolean } | Failure> {
  return transaction(db, async (connection) => {
    const target = await targetUser(connection, userId);
    if (!target) return { ok: false, status: 404, error: "Không tìm thấy tài khoản." };
    if (!canManageTarget(actor, target)) return { ok: false, status: 403, error: isProtectedOwner({ username: target.username, roleName: target.role_name }) ? "Không thể thay đổi tài khoản Owner." : "Bạn không có quyền quản lý tài khoản này." };
    const disabled = Boolean(target.disabled_forever) || Boolean(target.disabled_until && new Date(target.disabled_until).getTime() > now.getTime());
    await connection.execute("UPDATE users SET account_status = ?, locked_at = ?, locked_by = ?, lock_reason = ? WHERE id = ?", [locked ? "locked" : disabled ? "disabled" : "active", locked ? now : null, locked ? actor.id : null, locked ? reason : null, userId]);
    if (locked) {
      await connection.execute("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
      await connection.execute("DELETE FROM control_sessions WHERE user_id = ?", [userId]);
    }
    await audit(connection, actor.id, locked ? "user.lock" : "user.unlock", "user", userId, `${locked ? "Khóa" : "Mở khóa"} tài khoản @${target.username}`, { reason: reason || null });
    return { ok: true, locked };
  });
}

export async function setUserRole(actor: PublicUser, userId: number, role: AdminRole, db: AdminDb = getPool()): Promise<{ ok: true; role: AdminRole } | Failure> {
  return transaction(db, async (connection) => {
    const target = await targetUser(connection, userId);
    if (!target) return { ok: false, status: 404, error: "Không tìm thấy tài khoản." };
    if (isProtectedOwner({ username: target.username, roleName: target.role_name })) return { ok: false, status: 403, error: "Không thể thay đổi tài khoản Owner." };
    if (!canAssignRole(actor.roleName, target.role_name, role)) return { ok: false, status: 403, error: "Bạn không thể gán vai trò này." };
    await connection.execute("UPDATE users SET role_name = ? WHERE id = ?", [role, userId]);
    await audit(connection, actor.id, "user.role", "user", userId, `Đổi vai trò @${target.username} thành ${role}`, { from: target.role_name, to: role });
    return { ok: true, role };
  });
}

export async function revokeUserSessions(actor: PublicUser, userId: number, db: AdminDb = getPool()): Promise<{ ok: true } | Failure> {
  return transaction(db, async (connection) => {
    const target = await targetUser(connection, userId);
    if (!target) return { ok: false, status: 404, error: "Không tìm thấy tài khoản." };
    if (!canManageTarget(actor, target)) return { ok: false, status: 403, error: "Bạn không có quyền thu hồi phiên của tài khoản này." };
    await connection.execute("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
    await connection.execute("DELETE FROM control_sessions WHERE user_id = ?", [userId]);
    await audit(connection, actor.id, "user.sessions.revoke", "user", userId, `Thu hồi toàn bộ phiên của @${target.username}`);
    return { ok: true };
  });
}

export async function getAdminOverview(db: Pick<Pool, "query"> = getPool()): Promise<AdminOverview> {
  const [rows] = await db.query(`SELECT
    (SELECT COUNT(*) FROM users) users,
    (SELECT COUNT(*) FROM users WHERE account_status='active') active_users,
    (SELECT COUNT(*) FROM users WHERE account_status='locked') locked_users,
    (SELECT COUNT(*) FROM auth_sessions WHERE expires_at > NOW()) active_sessions,
    (SELECT COUNT(*) FROM forum_topics WHERE deleted_at IS NULL) forum_topics,
    (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL) wiki_pages,
    (SELECT COUNT(*) FROM wiki_media WHERE deleted_at IS NULL) media_files,
    ((SELECT COUNT(*) FROM forum_topics WHERE deleted_at IS NOT NULL) + (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NOT NULL) + (SELECT COUNT(*) FROM wiki_media WHERE deleted_at IS NOT NULL)) trash_items,
    (SELECT COUNT(*) FROM forum_topics WHERE deleted_at IS NULL AND is_pinned=TRUE) pinned_topics,
    (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL AND is_published=FALSE) draft_wiki_pages,
    (SELECT COUNT(*) FROM wiki_media WHERE deleted_at IS NULL AND page_id IS NULL) unattached_media,
    ((SELECT COUNT(*) FROM forum_topics WHERE purge_after BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 7 DAY)) + (SELECT COUNT(*) FROM wiki_pages WHERE purge_after BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 7 DAY)) + (SELECT COUNT(*) FROM wiki_media WHERE purge_after BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 7 DAY))) expiring_trash`) as [Array<Record<string, unknown>>, unknown];
  const row = rows[0] ?? {};
  return { users: number(row.users), activeUsers: number(row.active_users), lockedUsers: number(row.locked_users), activeSessions: number(row.active_sessions), forumTopics: number(row.forum_topics), wikiPages: number(row.wiki_pages), mediaFiles: number(row.media_files), trashItems: number(row.trash_items), pinnedTopics: number(row.pinned_topics), draftWikiPages: number(row.draft_wiki_pages), unattachedMedia: number(row.unattached_media), expiringTrash: number(row.expiring_trash) };
}

export async function listAdminUsers(query = "", status = "all", role = "all", db: Pick<Pool, "query"> = getPool()): Promise<AdminUser[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (query.trim()) { conditions.push("(u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?)"); params.push(...Array(3).fill(`%${query.trim()}%`)); }
  if (["active", "locked", "disabled"].includes(status)) { conditions.push("u.account_status = ?"); params.push(status); }
  if (["owner", "admin", "staff", "player"].includes(role)) { conditions.push("u.role_name = ?"); params.push(role); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.query(`SELECT u.id,u.username,u.display_name,u.email,u.role_name,u.avatar_url,u.account_status,u.disabled_until,u.disabled_forever,u.disabled_reason,u.created_at,COUNT(DISTINCT s.id) sessions,COUNT(DISTINCT ft.id) posts FROM users u LEFT JOIN auth_sessions s ON s.user_id=u.id AND s.expires_at>NOW() LEFT JOIN forum_topics ft ON ft.author_id=u.id AND ft.deleted_at IS NULL ${where} GROUP BY u.id ORDER BY FIELD(u.role_name,'owner','admin','staff','player'),u.created_at DESC LIMIT 200`, params) as [Array<Record<string, unknown>>, unknown];
  return rows.map((r) => {
    const accessActive = isUserAccessActive({ accountStatus: String(r.account_status), disabledUntil: r.disabled_until as Date | string | null, disabledForever: Boolean(r.disabled_forever) });
    const accountStatus = accessActive ? "active" : r.account_status === "locked" ? "locked" : "disabled";
    return { id: number(r.id), username: String(r.username), displayName: String(r.display_name), email: r.email ? String(r.email) : null, roleName: normalizeAdminRole(r.role_name), avatarUrl: r.avatar_url ? String(r.avatar_url) : null, accountStatus, disabledUntil: r.disabled_until as Date | string | null, disabledForever: Boolean(r.disabled_forever), disabledReason: r.disabled_reason ? String(r.disabled_reason) : null, sessions: number(r.sessions), posts: number(r.posts), createdAt: r.created_at as Date | string };
  });
}

export async function listAdminContent(kindOrFilters: "all" | ContentKind | AdminContentFilters = "all", legacyTrash = false, db: Pick<Pool, "query"> = getPool()): Promise<AdminContentItem[]> {
  const filters: AdminContentFilters = typeof kindOrFilters === "string" ? { kind: kindOrFilters, trash: legacyTrash } : kindOrFilters;
  const kind = filters.kind ?? "all";
  const trash = Boolean(filters.trash);
  const deleted = trash ? "IS NOT NULL" : "IS NULL";
  const query = filters.query?.trim() ?? "";
  const like = `%${query}%`;
  const selects = [
    `SELECT ft.id,'forum' kind,ft.title,IF(ft.is_pinned,'Ghim','Công khai') status,u.display_name author,ft.updated_at,ft.deleted_at,ft.purge_after,ft.is_pinned pinned,ft.category_id,fc.title category_name,NULL cluster_id,NULL cluster_name,NULL media_path,NULL media_type,NULL size_bytes,NULL attached_page FROM forum_topics ft LEFT JOIN users u ON u.id=ft.author_id LEFT JOIN forum_categories fc ON fc.id=ft.category_id WHERE ft.deleted_at ${deleted} ${query ? "AND (ft.title LIKE ? OR u.display_name LIKE ?)" : ""}`,
    `SELECT wp.id,'wiki' kind,wp.title,IF(wp.is_published,'Xuất bản','Bản nháp') status,u.display_name author,wp.updated_at,wp.deleted_at,wp.purge_after,FALSE pinned,NULL category_id,NULL category_name,wp.cluster_id,wc.name cluster_name,NULL media_path,NULL media_type,NULL size_bytes,NULL attached_page FROM wiki_pages wp LEFT JOIN users u ON u.id=wp.author_id LEFT JOIN wiki_clusters wc ON wc.id=wp.cluster_id WHERE wp.deleted_at ${deleted} ${query ? "AND (wp.title LIKE ? OR wp.slug LIKE ?)" : ""}`,
    `SELECT wm.id,'media' kind,wm.original_name title,wm.media_type status,u.display_name author,wm.created_at updated_at,wm.deleted_at,wm.purge_after,FALSE pinned,NULL category_id,NULL category_name,NULL cluster_id,NULL cluster_name,wm.path media_path,wm.media_type,wm.size_bytes,wp.title attached_page FROM wiki_media wm LEFT JOIN users u ON u.id=wm.uploader_id LEFT JOIN wiki_pages wp ON wp.id=wm.page_id WHERE wm.deleted_at ${deleted} ${query ? "AND (wm.original_name LIKE ? OR u.display_name LIKE ?)" : ""}`
  ];
  const sql = kind === "all" ? selects.join(" UNION ALL ") : selects[["forum", "wiki", "media"].indexOf(kind)];
  const repeat = kind === "all" ? 3 : 1;
  const params = query ? Array.from({ length: repeat * 2 }, () => like) : [];
  const status = filters.status;
  const statusFilter = status === "pinned" ? "WHERE kind='forum' AND pinned=TRUE" : status === "draft" ? "WHERE kind='wiki' AND status='Bản nháp'" : status === "unattached" ? "WHERE kind='media' AND attached_page IS NULL" : "";
  const [rows] = await db.query(`SELECT * FROM (${sql}) content ${statusFilter} ORDER BY updated_at DESC LIMIT 200`, params) as [Array<Record<string, unknown>>, unknown];
  return rows.map((r) => ({ id: number(r.id), kind: r.kind as ContentKind, title: String(r.title), status: String(r.status), author: r.author ? String(r.author) : null, updatedAt: r.updated_at as Date | string, deletedAt: r.deleted_at as Date | string | null, purgeAfter: r.purge_after as Date | string | null, pinned: Boolean(r.pinned), categoryId: r.category_id ? number(r.category_id) : null, categoryName: r.category_name ? String(r.category_name) : null, clusterId: r.cluster_id ? number(r.cluster_id) : null, clusterName: r.cluster_name ? String(r.cluster_name) : null, mediaPath: r.media_path ? String(r.media_path) : null, mediaType: r.media_type ? String(r.media_type) : null, sizeBytes: r.size_bytes === null || r.size_bytes === undefined ? null : number(r.size_bytes), attachedPage: r.attached_page ? String(r.attached_page) : null }));
}

export async function setContentTrashState(actor: PublicUser, kind: ContentKind, id: number, trashed: boolean, db: AdminDb = getPool(), now = new Date()) {
  const table = CONTENT_TABLES[kind];
  if (!table) return { ok: false as const, status: 404 as const, error: "Loại nội dung không tồn tại." };
  const purgeAfter = trashed ? new Date(now.getTime() + 30 * 86400000) : null;
  return transaction(db, async (connection) => {
    await connection.execute(`UPDATE ${table} SET deleted_at=?,deleted_by=?,purge_after=? WHERE id=?`, [trashed ? now : null, trashed ? actor.id : null, purgeAfter, id]);
    await audit(connection, actor.id, trashed ? "content.trash" : "content.restore", kind, id, `${trashed ? "Đưa vào thùng rác" : "Khôi phục"}: ${kind} #${id}`);
    return { ok: true as const };
  });
}

export async function permanentlyDeleteContent(actor: PublicUser, kind: ContentKind, id: number, db: AdminDb = getPool()) {
  const table = CONTENT_TABLES[kind];
  if (!table) return { ok: false as const, status: 404 as const, error: "Loại nội dung không tồn tại." };
  return transaction(db, async (connection) => {
    if (kind === "media") {
      const [rows] = await connection.query("SELECT page_id FROM wiki_media WHERE id=? AND deleted_at IS NOT NULL LIMIT 1 FOR UPDATE", [id]) as [Array<{ page_id: number | null }>, unknown];
      if (rows[0]?.page_id) return { ok: false as const, status: 409 as const, error: "Media đang được một bài Wiki sử dụng. Hãy gỡ media khỏi bài trước." };
    }
    const [result] = await connection.execute(`DELETE FROM ${table} WHERE id=? AND deleted_at IS NOT NULL`, [id]);
    if (number((result as { affectedRows?: number }).affectedRows) === 0) return { ok: false as const, status: 409 as const, error: "Chỉ có thể xóa vĩnh viễn nội dung đang ở thùng rác." };
    await audit(connection, actor.id, "content.delete", kind, id, `Xóa vĩnh viễn: ${kind} #${id}`);
    return { ok: true as const };
  });
}

export async function listSiteSettings(db: Pick<Pool, "query"> = getPool()): Promise<SiteSetting[]> {
  const [rows] = await db.query("SELECT setting_key,setting_value,setting_group,updated_at FROM site_settings ORDER BY setting_group,setting_key") as [Array<Record<string, unknown>>, unknown];
  return rows.map((r) => ({ key: r.setting_key as EditableSetting, value: String(r.setting_value), group: String(r.setting_group), updatedAt: r.updated_at as Date | string }));
}

export async function updateSiteSettings(actor: PublicUser, settings: Partial<Record<EditableSetting, string>>, db: AdminDb = getPool()) {
  return transaction(db, async (connection) => {
    for (const [key, value] of Object.entries(settings)) await connection.execute("UPDATE site_settings SET setting_value=?,updated_by=? WHERE setting_key=?", [value, actor.id, key]);
    await audit(connection, actor.id, "settings.update", "settings", "site", "Cập nhật cấu hình website", { keys: Object.keys(settings) });
    return { ok: true as const };
  });
}

export async function listAuditLogs(limit = 100, filtersOrDb: AuditFilters | Pick<Pool, "query"> = {}, maybeDb: Pick<Pool, "query"> = getPool()): Promise<AdminAuditEntry[]> {
  const filters = "query" in filtersOrDb ? {} : filtersOrDb as AuditFilters;
  const db = "query" in filtersOrDb ? filtersOrDb as Pick<Pool, "query"> : maybeDb;
  const conditions: string[] = []; const params: unknown[] = [];
  if (filters.actor?.trim()) { conditions.push("(u.username LIKE ? OR u.display_name LIKE ?)"); params.push(`%${filters.actor.trim()}%`, `%${filters.actor.trim()}%`); }
  if (filters.action?.trim()) { conditions.push("a.action LIKE ?"); params.push(`%${filters.action.trim()}%`); }
  if (filters.target?.trim()) { conditions.push("a.target_type LIKE ?"); params.push(`%${filters.target.trim()}%`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? "")) { conditions.push("a.created_at>=?"); params.push(`${filters.from} 00:00:00`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.to ?? "")) { conditions.push("a.created_at<DATE_ADD(?,INTERVAL 1 DAY)"); params.push(`${filters.to} 00:00:00`); }
  params.push(Math.min(Math.max(limit, 1), 200));
  const [rows] = await db.query(`SELECT a.id,u.display_name actor,a.action,a.target_type,a.target_id,a.summary,a.created_at FROM admin_audit_logs a LEFT JOIN users u ON u.id=a.actor_id ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY a.created_at DESC LIMIT ?`, params) as [Array<Record<string, unknown>>, unknown];
  return rows.map((r) => ({ id: number(r.id), actor: r.actor ? String(r.actor) : null, action: String(r.action), targetType: String(r.target_type), targetId: r.target_id ? String(r.target_id) : null, summary: String(r.summary), createdAt: r.created_at as Date | string }));
}
