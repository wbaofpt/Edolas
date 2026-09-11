import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";
import type { BulkContentItem, ContentOperation } from "./validation.ts";

type Db = Pick<Pool, "getConnection">;
type Connection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;
const TABLES = { forum: "forum_topics", wiki: "wiki_pages", media: "wiki_media" } as const;

async function transaction<T>(db: Db, work: (connection: Connection) => Promise<T>) {
  const connection = await db.getConnection() as Connection;
  await connection.beginTransaction();
  try {
    const result = await work(connection);
    if (result && typeof result === "object" && "ok" in result && result.ok === false) await connection.rollback();
    else await connection.commit();
    return result;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function applyContentOperation(actor: PublicUser, kind: "forum" | "wiki", id: number, operation: ContentOperation, db: Db = getPool()) {
  return transaction(db, async (connection) => {
    let sql = "";
    let params: Array<number | boolean | string> = [];
    if (kind === "forum" && operation.action === "pin") { sql = "UPDATE forum_topics SET is_pinned=? WHERE id=? AND deleted_at IS NULL"; params = [operation.pinned, id]; }
    else if (kind === "forum" && operation.action === "move") {
      const [rows] = await connection.query("SELECT id FROM forum_categories WHERE id=? LIMIT 1", [operation.categoryId]) as [Array<{ id: number }>, unknown];
      if (!rows[0]) return { ok: false as const, status: 404 as const, error: "Danh mục diễn đàn không tồn tại." };
      sql = "UPDATE forum_topics SET category_id=? WHERE id=? AND deleted_at IS NULL"; params = [operation.categoryId, id];
    } else if (kind === "wiki" && operation.action === "publish") { sql = "UPDATE wiki_pages SET is_published=? WHERE id=? AND deleted_at IS NULL"; params = [operation.published, id]; }
    else if (kind === "wiki" && operation.action === "move-cluster") {
      const [rows] = await connection.query("SELECT id,name FROM wiki_clusters WHERE id=? LIMIT 1", [operation.clusterId]) as [Array<{ id: number; name: string }>, unknown];
      if (!rows[0]) return { ok: false as const, status: 404 as const, error: "Cụm Wiki không tồn tại." };
      sql = "UPDATE wiki_pages SET cluster_id=?,section_name=? WHERE id=? AND deleted_at IS NULL"; params = [operation.clusterId, rows[0].name, id];
    } else return { ok: false as const, status: 400 as const, error: "Thao tác không phù hợp với loại nội dung." };
    const [result] = await connection.execute(sql, params);
    if (Number((result as { affectedRows?: number }).affectedRows) < 1) return { ok: false as const, status: 404 as const, error: "Không tìm thấy nội dung." };
    await connection.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)", [actor.id, `content.${operation.action}`, kind, String(id), `Cập nhật ${kind} #${id}`, JSON.stringify(operation)]);
    return { ok: true as const };
  });
}

export async function bulkSetContentTrash(actor: PublicUser, items: BulkContentItem[], trashed: boolean, db: Db = getPool(), now = new Date()) {
  if (items.length < 1 || items.length > 100) return { ok: false as const, status: 400 as const, error: "Chọn từ 1 đến 100 nội dung." };
  return transaction(db, async (connection) => {
    const purgeAfter = trashed ? new Date(now.getTime() + 30 * 86400000) : null;
    for (const item of items) {
      const table = TABLES[item.kind];
      const [result] = await connection.execute(`UPDATE ${table} SET deleted_at=?,deleted_by=?,purge_after=? WHERE id=? AND deleted_at ${trashed ? "IS NULL" : "IS NOT NULL"}`, [trashed ? now : null, trashed ? actor.id : null, purgeAfter, item.id]);
      if (Number((result as { affectedRows?: number }).affectedRows) !== 1) return { ok: false as const, status: 409 as const, error: "Một nội dung đã thay đổi hoặc không còn tồn tại. Vui lòng tải lại danh sách." };
    }
    await connection.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)", [actor.id, trashed ? "content.bulk-trash" : "content.bulk-restore", "content", null, `${trashed ? "Đưa" : "Khôi phục"} ${items.length} nội dung ${trashed ? "vào thùng rác" : ""}`.trim(), JSON.stringify({ items })]);
    return { ok: true as const, count: items.length };
  });
}
