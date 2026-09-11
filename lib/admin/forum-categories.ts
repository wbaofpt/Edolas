import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";
import { canManageUsers } from "./authorization.ts";

export type ForumCategory = { id: number; title: string; slug: string; description: string; sortOrder: number; topics: number };
export type ForumCategoryInput = Omit<ForumCategory, "id" | "topics">;
type Db = Pick<Pool, "query" | "getConnection">;
type Connection = Pick<PoolConnection, "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release">;

export function parseForumCategory(input: unknown): { ok: true; value: ForumCategoryInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Dữ liệu danh mục không hợp lệ." };
  const raw = input as Record<string, unknown>;
  const value = { title: typeof raw.title === "string" ? raw.title.trim().slice(0, 120) : "", slug: typeof raw.slug === "string" ? raw.slug.trim().toLowerCase().slice(0, 60) : "", description: typeof raw.description === "string" ? raw.description.trim().slice(0, 1000) : "", sortOrder: Number(raw.sortOrder) };
  if (value.title.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) || value.description.length < 3 || !Number.isInteger(value.sortOrder) || value.sortOrder < -9999 || value.sortOrder > 9999) return { ok: false, error: "Tên, slug, mô tả hoặc thứ tự danh mục không hợp lệ." };
  return { ok: true, value };
}

async function transaction<T>(db: Pick<Pool, "getConnection">, work: (connection: Connection) => Promise<T>) { const connection = await db.getConnection() as Connection; await connection.beginTransaction(); try { const result = await work(connection); if (result && typeof result === "object" && "ok" in result && result.ok === false) await connection.rollback(); else await connection.commit(); return result; } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } }

export async function listForumCategories(db: Pick<Pool, "query"> = getPool()): Promise<ForumCategory[]> {
  const [rows] = await db.query("SELECT fc.id,fc.title,fc.slug,fc.description,fc.sort_order,COUNT(ft.id) topics FROM forum_categories fc LEFT JOIN forum_topics ft ON ft.category_id=fc.id AND ft.deleted_at IS NULL GROUP BY fc.id ORDER BY fc.sort_order,fc.title") as [Array<Record<string, unknown>>, unknown];
  return rows.map((row) => ({ id: Number(row.id), title: String(row.title), slug: String(row.slug), description: String(row.description), sortOrder: Number(row.sort_order), topics: Number(row.topics) }));
}

export async function saveForumCategory(actor: PublicUser, id: number | null, input: unknown, db: Pick<Pool, "getConnection"> = getPool()) {
  if (!canManageUsers(actor.roleName)) return { ok: false as const, status: 403 as const, error: "Bạn không có quyền quản lý danh mục." };
  const parsed = parseForumCategory(input); if (!parsed.ok) return { ok: false as const, status: 400 as const, error: parsed.error };
  return transaction(db, async (connection) => {
    const value = parsed.value;
    const [result] = id ? await connection.execute("UPDATE forum_categories SET title=?,slug=?,description=?,sort_order=? WHERE id=?", [value.title,value.slug,value.description,value.sortOrder,id]) : await connection.execute("INSERT INTO forum_categories (title,slug,description,sort_order) VALUES (?,?,?,?)", [value.title,value.slug,value.description,value.sortOrder]);
    const categoryId = id ?? Number((result as { insertId?: number }).insertId);
    await connection.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)", [actor.id,id ? "forum.category.update" : "forum.category.create","forum_category",String(categoryId),`${id ? "Cập nhật" : "Tạo"} danh mục ${value.title}`,JSON.stringify(value)]);
    return { ok: true as const, id: categoryId };
  });
}

export async function deleteForumCategory(actor: PublicUser, id: number, db: Pick<Pool, "getConnection"> = getPool()) {
  if (!canManageUsers(actor.roleName)) return { ok: false as const, status: 403 as const, error: "Bạn không có quyền quản lý danh mục." };
  return transaction(db, async (connection) => {
    const [rows] = await connection.query("SELECT COUNT(*) topics FROM forum_topics WHERE category_id=?", [id]) as [Array<{ topics: number | string }>, unknown];
    if (Number(rows[0]?.topics) > 0) return { ok: false as const, status: 409 as const, error: "Hãy chuyển hoặc xóa các bài trong danh mục trước." };
    await connection.execute("DELETE FROM forum_categories WHERE id=?", [id]);
    await connection.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary) VALUES (?,?,?,?,?)", [actor.id,"forum.category.delete","forum_category",String(id),`Xóa danh mục diễn đàn #${id}`]);
    return { ok: true as const };
  });
}
