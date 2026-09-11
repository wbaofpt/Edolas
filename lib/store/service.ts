import { randomBytes } from "node:crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";
import { parseStoreOrderInput, type StoreOrderInput, type StorePaymentMethod } from "./validation.ts";

export type StoreOrderStatus = "pending_payment" | "approved" | "delivering" | "fulfilled" | "failed" | "needs_review" | "cancelled";
export type PublicStoreGroup = { key:string; displayName:string; sortOrder:number; online:boolean };
export type PublicStorePackage = { id:number; slug:string; name:string; description:string; groupKey:string; priceVnd:number; accent:string; categoryId:number|null; categorySlug:string; categoryName:string; imagePath:string|null; badge:string|null; featured:boolean; soldCount:number; online:boolean };
export type PublicStoreOrder = { id:number; reference:string; packageName:string; groupKey:string; minecraftUsername:string; paymentMethod:StorePaymentMethod; priceVnd:number; status:StoreOrderStatus; createdAt:string };
type StoreDb = Pick<Pool, "query" | "getConnection">;
type StoreConnection = Pick<PoolConnection, "beginTransaction" | "commit" | "rollback" | "release" | "query" | "execute">;

function packageRow(row: Record<string, unknown>): PublicStorePackage {
  const badge = typeof row.badge === "string" && row.badge.trim() ? row.badge : null;
  return { id:Number(row.id), slug:String(row.slug), name:String(row.name), description:String(row.description), groupKey:String(row.group_key), priceVnd:Number(row.price_vnd), accent:String(row.accent), categoryId:row.category_id == null ? null : Number(row.category_id), categorySlug:typeof row.category_slug === "string" ? row.category_slug : "other", categoryName:typeof row.category_name === "string" ? row.category_name : "Khác", imagePath:typeof row.image_path === "string" ? row.image_path : null, badge, featured:Boolean(Number(row.is_featured)), soldCount:Number(row.sold_count ?? 0), online:Number(row.active_backends) > 0 };
}

function orderRow(row: Record<string, unknown>): PublicStoreOrder {
  return { id:Number(row.id), reference:String(row.reference), packageName:String(row.package_name), groupKey:String(row.group_key), minecraftUsername:String(row.minecraft_username), paymentMethod:row.payment_method as StorePaymentMethod, priceVnd:Number(row.price_vnd), status:row.status as StoreOrderStatus, createdAt:new Date(row.created_at as string | Date).toISOString() };
}

export async function listStoreCatalog(db: Pick<Pool, "query"> = getPool(), now = new Date()) {
  const freshAfter = new Date(now.getTime() - 30_000);
  const [groupRows] = await db.query(`SELECT sg.group_key,sg.display_name,sg.sort_order,
    (SELECT COUNT(*) FROM minecraft_servers ms WHERE ms.group_key=sg.group_key AND ms.last_seen_at>=?) active_backends
    FROM store_groups sg
    WHERE sg.is_active=TRUE
    ORDER BY sg.sort_order,sg.group_key`, [freshAfter]) as [Array<Record<string, unknown>>, unknown];
  const [rows] = await db.query(`SELECT p.id,p.slug,p.name,p.description,p.group_key,p.price_vnd,p.accent,
    p.category_id,c.slug category_slug,c.name category_name,p.image_path,p.badge,p.is_featured,
    (SELECT COUNT(*) FROM store_orders o WHERE o.package_id=p.id AND o.status='fulfilled') sold_count,
    (SELECT COUNT(*) FROM minecraft_servers ms WHERE ms.group_key=p.group_key AND ms.last_seen_at>=?) active_backends
    FROM store_packages p
    JOIN store_groups sg ON sg.group_key=p.group_key AND sg.is_active=TRUE
    LEFT JOIN store_categories c ON c.id=p.category_id AND c.group_key=p.group_key AND c.is_active=TRUE
    WHERE p.is_active=TRUE
    ORDER BY sg.sort_order,p.is_featured DESC,COALESCE(c.sort_order,65535),p.sort_order,p.id`, [freshAfter]) as [Array<Record<string, unknown>>, unknown];
  return {
    groups: groupRows.map((row): PublicStoreGroup => ({
      key: String(row.group_key),
      displayName: String(row.display_name),
      sortOrder: Number(row.sort_order),
      online: Number(row.active_backends) > 0,
    })),
    packages: rows.map(packageRow),
  };
}

export async function listUserStoreOrders(userId: number, db: Pick<Pool, "query"> = getPool()) {
  const [rows] = await db.query(`SELECT id,reference,package_name,group_key,minecraft_username,payment_method,price_vnd,status,created_at
    FROM store_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50`, [userId]) as [Array<Record<string, unknown>>, unknown];
  return rows.map(orderRow);
}

function orderReference() {
  return `EDO-${randomBytes(8).toString("hex").slice(0, 10).toUpperCase()}`;
}

export async function createStoreOrder(
  user: PublicUser,
  rawInput: unknown,
  deps: { db?: StoreDb; now?: Date; reference?: () => string } = {}
): Promise<{ ok:true; order:PublicStoreOrder } | { ok:false; status:400|404|409|503; error:string }> {
  const parsed = parseStoreOrderInput(rawInput);
  if (!parsed.ok) return { ok:false, status:400, error:parsed.error };
  const db = deps.db ?? getPool();
  const now = deps.now ?? new Date();
  const connection = await db.getConnection() as StoreConnection;
  try {
    await connection.beginTransaction();
    const [packages] = await connection.query(`SELECT p.id,p.slug,p.name,p.price_vnd,p.group_key,p.command_template,
      EXISTS(SELECT 1 FROM minecraft_servers ms WHERE ms.group_key=p.group_key AND ms.last_seen_at>=?) online
      FROM store_packages p
      JOIN store_groups sg ON sg.group_key=p.group_key AND sg.is_active=TRUE
      WHERE p.id=? AND p.is_active=TRUE LIMIT 1 FOR UPDATE`, [new Date(now.getTime()-30_000), parsed.value.packageId]) as [Array<Record<string, unknown>>, unknown];
    const selected = packages[0];
    if (!selected) { await connection.rollback(); return { ok:false, status:404, error:"Gói nạp không còn khả dụng." }; }
    if (!Boolean(selected.online)) { await connection.rollback(); return { ok:false, status:409, error:"Cụm máy chủ đang offline. Vui lòng thử lại khi cụm hoạt động." }; }
    const reference = (deps.reference ?? orderReference)();
    const [result] = await connection.execute(`INSERT INTO store_orders
      (reference,user_id,client_request_key,package_id,package_name,package_slug,command_template_snapshot,price_vnd,group_key,minecraft_username,payment_method,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending_payment',?,?)`, [reference,user.id,parsed.value.clientRequestKey,Number(selected.id),String(selected.name),String(selected.slug),String(selected.command_template),Number(selected.price_vnd),String(selected.group_key),parsed.value.minecraftUsername,parsed.value.paymentMethod,now,now]);
    const order: PublicStoreOrder = { id:Number((result as {insertId?:number}).insertId), reference, packageName:String(selected.name), groupKey:String(selected.group_key), minecraftUsername:parsed.value.minecraftUsername, paymentMethod:parsed.value.paymentMethod, priceVnd:Number(selected.price_vnd), status:"pending_payment", createdAt:now.toISOString() };
    await connection.commit();
    return { ok:true, order };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") return { ok:false, status:409, error:"Không thể tạo mã đơn duy nhất. Vui lòng thử lại." };
    return { ok:false, status:503, error:"Không thể tạo đơn hàng lúc này." };
  } finally {
    connection.release();
  }
}

export type { StoreOrderInput };
