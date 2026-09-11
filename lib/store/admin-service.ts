import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { canManageUsers } from "../admin/authorization.ts";
import { getPool } from "../db.ts";
import {
  parseStoreCategoryInput,
  parseStoreGroupInput,
  parseStorePackageInput,
  isStoreGroupKey,
  renderStoreCommand,
} from "./validation.ts";

type StoreAdminDb = Pick<Pool, "query" | "getConnection">;
type Connection = Pick<
  PoolConnection,
  "beginTransaction" | "commit" | "rollback" | "release" | "query" | "execute"
>;
type Failure = { ok: false; status: 400 | 403 | 404 | 409; error: string };
export type StoreAdminPackage = {
  id: number;
  slug: string;
  name: string;
  description: string;
  groupKey: string;
  priceVnd: number;
  commandTemplate: string;
  accent: string;
  sortOrder: number;
  active: boolean;
  categoryId: number | null;
  imagePath: string | null;
  badge: string | null;
  featured: boolean;
};
export type StoreAdminCategory = {
  id: number;
  groupKey: string;
  slug: string;
  name: string;
  sortOrder: number;
  active: boolean;
  packageCount: number;
};
export type StoreAdminGroup = {
  key: string;
  displayName: string;
  sortOrder: number;
  active: boolean;
  online: boolean;
  categoryCount: number;
  packageCount: number;
  lastSeenAt: string | null;
};
export type StoreAdminOrder = {
  id: number;
  reference: string;
  account: string;
  packageId: number | null;
  packageName: string;
  packageSlug: string;
  commandTemplateSnapshot: string | null;
  groupKey: string;
  minecraftUsername: string;
  paymentMethod: string;
  priceVnd: number;
  status: string;
  deliveryStatus: string | null;
  claimedByServer: string | null;
  claimedAt: string | null;
  createdAt: string;
};
export type StoreAdminPayment = {
  id: number;
  reference: string;
  accountUsername: string;
  accountEmail: string;
  minecraftUsername: string;
  packageName: string;
  groupKey: string;
  provider: string;
  attemptStatus: string;
  orderStatus: string;
  amountVnd: number;
  providerTransactionId: string | null;
  deliveryStatus: string | null;
  signatureWarning: boolean;
  createdAt: string;
  paidAt: string | null;
};

function packageFromRow(row: Record<string, unknown>): StoreAdminPackage {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    groupKey: String(row.group_key),
    priceVnd: Number(row.price_vnd),
    commandTemplate: String(row.command_template),
    accent: String(row.accent),
    sortOrder: Number(row.sort_order),
    active: Boolean(row.is_active),
    categoryId: row.category_id == null ? null : Number(row.category_id),
    imagePath: typeof row.image_path === "string" ? row.image_path : null,
    badge: typeof row.badge === "string" ? row.badge : null,
    featured: Boolean(row.is_featured),
  };
}

function categoryFromRow(row: Record<string, unknown>): StoreAdminCategory {
  return {
    id: Number(row.id),
    groupKey: String(row.group_key),
    slug: String(row.slug),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
    active: Boolean(row.is_active),
    packageCount: Number(row.package_count ?? 0),
  };
}
function orderFromRow(row: Record<string, unknown>): StoreAdminOrder {
  return {
    id: Number(row.id),
    reference: String(row.reference),
    account: String(row.account),
    packageId: row.package_id === null ? null : Number(row.package_id),
    packageName: String(row.package_name),
    packageSlug: String(row.package_slug),
    commandTemplateSnapshot:
      typeof row.command_template_snapshot === "string"
        ? row.command_template_snapshot
        : null,
    groupKey: String(row.group_key),
    minecraftUsername: String(row.minecraft_username),
    paymentMethod: String(row.payment_method),
    priceVnd: Number(row.price_vnd),
    status: String(row.status),
    deliveryStatus: row.delivery_status ? String(row.delivery_status) : null,
    claimedByServer: row.claimed_by_server
      ? String(row.claimed_by_server)
      : null,
    claimedAt: row.claimed_at
      ? new Date(row.claimed_at as string | Date).toISOString()
      : null,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  };
}

function paymentFromRow(row: Record<string, unknown>): StoreAdminPayment {
  return {
    id: Number(row.id), reference: String(row.reference),
    accountUsername: String(row.account_username_snapshot), accountEmail: String(row.account_email_snapshot),
    minecraftUsername: String(row.minecraft_username_snapshot), packageName: String(row.package_name),
    groupKey: String(row.group_key), provider: String(row.provider), attemptStatus: String(row.attempt_status),
    orderStatus: String(row.order_status), amountVnd: Number(row.amount_vnd),
    providerTransactionId: typeof row.provider_transaction_id === "string" ? row.provider_transaction_id : null,
    deliveryStatus: typeof row.delivery_status === "string" ? row.delivery_status : null,
    signatureWarning: Number(row.invalid_signature_count ?? 0) > 0,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at as string | Date).toISOString() : null,
  };
}

export async function listStoreAdminData(db: Pick<Pool, "query"> = getPool()) {
  const [categoryRows] = (await db.query(
    `SELECT c.id,c.group_key,c.slug,c.name,c.sort_order,c.is_active,COUNT(p.id) package_count
    FROM store_categories c LEFT JOIN store_packages p ON p.category_id=c.id
    GROUP BY c.id,c.group_key,c.slug,c.name,c.sort_order,c.is_active ORDER BY c.group_key,c.sort_order,c.id`,
  )) as [Array<Record<string, unknown>>, unknown];
  const [packageRows] = (await db.query(
    "SELECT id,slug,name,description,group_key,category_id,image_path,badge,is_featured,price_vnd,command_template,accent,sort_order,is_active FROM store_packages ORDER BY is_featured DESC,group_key,sort_order,id",
  )) as [Array<Record<string, unknown>>, unknown];
  const [orderRows] =
    (await db.query(`SELECT o.id,o.reference,u.username account,o.package_id,o.package_name,o.package_slug,o.command_template_snapshot,o.group_key,o.minecraft_username,o.payment_method,o.price_vnd,o.status,o.created_at,
    d.status delivery_status,d.claimed_by_server,d.claimed_at FROM store_orders o JOIN users u ON u.id=o.user_id LEFT JOIN store_command_deliveries d ON d.order_id=o.id ORDER BY o.created_at DESC`)) as [
      Array<Record<string, unknown>>,
      unknown,
    ];
  const [paymentRows] = (await db.query(`SELECT a.id,o.reference,a.account_username_snapshot,a.account_email_snapshot,
    a.minecraft_username_snapshot,o.package_name,o.group_key,a.provider,a.status attempt_status,o.status order_status,
    a.amount_vnd,a.provider_transaction_id,a.created_at,a.paid_at,d.status delivery_status,
    (SELECT COUNT(*) FROM store_payment_events e WHERE e.attempt_id=a.id AND e.signature_valid=FALSE) invalid_signature_count
    FROM store_payment_attempts a JOIN store_orders o ON o.id=a.order_id
    LEFT JOIN store_command_deliveries d ON d.order_id=o.id
    ORDER BY a.created_at DESC LIMIT 200`)) as [Array<Record<string, unknown>>, unknown];
  const [groupRows] = (await db.query(
    `SELECT known.group_key,COALESCE(sg.display_name,MAX(ms.display_name),known.group_key) display_name,
      COALESCE(sg.sort_order,0) sort_order,COALESCE(sg.is_active,FALSE) is_active,
      MAX(ms.last_seen_at) last_seen_at,MAX(ms.last_seen_at)>=DATE_SUB(NOW(3),INTERVAL 30 SECOND) online,
      COUNT(DISTINCT c.id) category_count,COUNT(DISTINCT p.id) package_count
    FROM (
      SELECT group_key FROM store_groups
      UNION
      SELECT group_key FROM minecraft_servers
    ) known
    LEFT JOIN store_groups sg ON sg.group_key=known.group_key
    LEFT JOIN minecraft_servers ms ON ms.group_key=known.group_key
    LEFT JOIN store_categories c ON c.group_key=known.group_key
    LEFT JOIN store_packages p ON p.group_key=known.group_key
    GROUP BY known.group_key,sg.display_name,sg.sort_order,sg.is_active
    ORDER BY COALESCE(sg.sort_order,0),known.group_key`,
  )) as [Array<Record<string, unknown>>, unknown];
  return {
    categories: categoryRows.map(categoryFromRow),
    packages: packageRows.map(packageFromRow),
    orders: orderRows.map(orderFromRow),
    payments: paymentRows.map(paymentFromRow),
    groups: groupRows.map((row) => ({
      key: String(row.group_key),
      displayName: String(row.display_name),
      sortOrder: Number(row.sort_order),
      active: Boolean(row.is_active),
      online: Boolean(row.online),
      categoryCount: Number(row.category_count ?? 0),
      packageCount: Number(row.package_count ?? 0),
      lastSeenAt: row.last_seen_at
        ? new Date(row.last_seen_at as string | Date).toISOString()
        : null,
    })),
  };
}

async function transaction<T>(
  db: StoreAdminDb,
  work: (connection: Connection) => Promise<T>,
): Promise<T> {
  const connection = (await db.getConnection()) as Connection;
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    if (
      result &&
      typeof result === "object" &&
      "ok" in result &&
      result.ok === false
    )
      await connection.rollback();
    else await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

function isDuplicateEntry(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY",
  );
}

export async function saveStorePackage(
  actor: PublicUser,
  rawInput: unknown,
  id?: number,
  db: StoreAdminDb = getPool(),
): Promise<{ ok: true; id: number } | Failure> {
  if (!canManageUsers(actor.roleName))
    return {
      ok: false,
      status: 403,
      error: "Bạn không có quyền quản lý cửa hàng.",
    };
  const parsed = parseStorePackageInput(rawInput);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  if (id !== undefined && (!Number.isSafeInteger(id) || id < 1))
    return { ok: false, status: 400, error: "Mã gói không hợp lệ." };
  try {
    return await transaction(db, async (connection) => {
    const value = parsed.value;
    const [groups] = (await connection.query(
      "SELECT group_key FROM store_groups WHERE group_key=? LIMIT 1 FOR UPDATE",
      [value.groupKey],
    )) as [Array<{ group_key: string }>, unknown];
    if (!groups[0]) {
      return { ok: false as const, status: 400 as const, error: "Cụm Store không tồn tại." };
    }
    if (value.categoryId !== null) {
      const [categories] = (await connection.query(
        "SELECT id,group_key FROM store_categories WHERE id=? LIMIT 1 FOR UPDATE",
        [value.categoryId],
      )) as [Array<{ id: number; group_key: string }>, unknown];
      if (!categories[0]) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "Danh muc da chon khong ton tai.",
        };
      }
      if (categories[0].group_key !== value.groupKey) {
        return { ok: false as const, status: 409 as const, error: "Danh mục không thuộc cụm Store đã chọn." };
      }
    }
    let packageId = id;
    if (id) {
      const [result] = await connection.execute(
        `UPDATE store_packages SET slug=?,name=?,description=?,group_key=?,category_id=?,badge=?,is_featured=?,price_vnd=?,command_template=?,accent=?,sort_order=?,is_active=?,updated_by=? WHERE id=?`,
        [
          value.slug,
          value.name,
          value.description,
          value.groupKey,
          value.categoryId,
          value.badge,
          value.featured,
          value.priceVnd,
          value.commandTemplate,
          value.accent,
          value.sortOrder,
          value.active,
          actor.id,
          id,
        ],
      );
      if (!Number((result as { affectedRows?: number }).affectedRows))
        return {
          ok: false as const,
          status: 404 as const,
          error: "Không tìm thấy gói nạp.",
        };
    } else {
      const [result] = await connection.execute(
        `INSERT INTO store_packages (slug,name,description,group_key,category_id,badge,is_featured,price_vnd,command_template,accent,sort_order,is_active,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          value.slug,
          value.name,
          value.description,
          value.groupKey,
          value.categoryId,
          value.badge,
          value.featured,
          value.priceVnd,
          value.commandTemplate,
          value.accent,
          value.sortOrder,
          value.active,
          actor.id,
          actor.id,
        ],
      );
      packageId = Number((result as { insertId?: number }).insertId);
    }
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [
        actor.id,
        id ? "store.package.update" : "store.package.create",
        "store_package",
        String(packageId),
        `${id ? "Cập nhật" : "Tạo"} gói ${value.name}`,
        JSON.stringify({
          slug: value.slug,
          groupKey: value.groupKey,
          priceVnd: value.priceVnd,
          active: value.active,
          categoryId: value.categoryId,
          featured: value.featured,
        }),
      ],
    );
    return { ok: true as const, id: packageId! };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return { ok: false, status: 409, error: "Slug gói đã được sử dụng." };
    }
    throw error;
  }
}

export async function saveStoreCategory(
  actor: PublicUser,
  rawInput: unknown,
  id?: number,
  db: StoreAdminDb = getPool(),
): Promise<{ ok: true; id: number } | Failure> {
  if (!canManageUsers(actor.roleName)) {
    return { ok: false, status: 403, error: "Ban khong co quyen quan ly danh muc." };
  }
  const parsed = parseStoreCategoryInput(rawInput);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) {
    return { ok: false, status: 400, error: "Ma danh muc khong hop le." };
  }
  try {
    return await transaction(db, async (connection) => {
    const value = parsed.value;
    const [groups] = (await connection.query(
      "SELECT group_key FROM store_groups WHERE group_key=? LIMIT 1 FOR UPDATE",
      [value.groupKey],
    )) as [Array<{ group_key: string }>, unknown];
    if (!groups[0]) {
      return { ok: false as const, status: 400 as const, error: "Cụm Store không tồn tại." };
    }
    let categoryId = id;
    if (id) {
      const [categories] = (await connection.query(
        "SELECT id,group_key FROM store_categories WHERE id=? LIMIT 1 FOR UPDATE",
        [id],
      )) as [Array<{ id: number; group_key: string }>, unknown];
      if (!categories[0]) {
        return { ok: false as const, status: 404 as const, error: "Không tìm thấy danh mục." };
      }
      if (categories[0].group_key !== value.groupKey) {
        const [counts] = (await connection.query(
          "SELECT COUNT(*) package_count FROM store_packages WHERE category_id=?",
          [id],
        )) as [Array<{ package_count: number }>, unknown];
        if (Number(counts[0]?.package_count) > 0) {
          return { ok: false as const, status: 409 as const, error: "Hãy chuyển các gói khỏi danh mục trước khi đổi cụm." };
        }
      }
      const [result] = await connection.execute(
        "UPDATE store_categories SET group_key=?,slug=?,name=?,sort_order=?,is_active=?,updated_by=? WHERE id=?",
        [value.groupKey, value.slug, value.name, value.sortOrder, value.active, actor.id, id],
      );
      if (!Number((result as { affectedRows?: number }).affectedRows)) {
        return { ok: false as const, status: 404 as const, error: "Khong tim thay danh muc." };
      }
    } else {
      const [result] = await connection.execute(
        "INSERT INTO store_categories (group_key,slug,name,sort_order,is_active,created_by,updated_by) VALUES (?,?,?,?,?,?,?)",
        [value.groupKey, value.slug, value.name, value.sortOrder, value.active, actor.id, actor.id],
      );
      categoryId = Number((result as { insertId?: number }).insertId);
    }
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [actor.id, id ? "store.category.update" : "store.category.create", "store_category", String(categoryId), `${id ? "Cập nhật" : "Tạo"} danh mục ${value.name}`, JSON.stringify({ groupKey: value.groupKey, slug: value.slug, active: value.active })],
    );
    return { ok: true as const, id: categoryId! };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return { ok: false, status: 409, error: "Slug danh mục đã được sử dụng." };
    }
    throw error;
  }
}

export async function saveStoreGroup(
  actor: PublicUser,
  groupKey: string,
  rawInput: unknown,
  db: StoreAdminDb = getPool(),
): Promise<{ ok: true; group: StoreAdminGroup } | Failure> {
  if (!canManageUsers(actor.roleName)) {
    return { ok: false, status: 403, error: "Bạn không có quyền quản lý cụm Store." };
  }
  if (!isStoreGroupKey(groupKey)) {
    return { ok: false, status: 400, error: "Khóa cụm không hợp lệ." };
  }
  const parsed = parseStoreGroupInput(rawInput);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  return transaction(db, async (connection) => {
    const [storeGroups] = (await connection.query(
      "SELECT group_key FROM store_groups WHERE group_key=? LIMIT 1 FOR UPDATE",
      [groupKey],
    )) as [Array<{ group_key: string }>, unknown];
    const [telemetry] = (await connection.query(
      "SELECT group_key,last_seen_at FROM minecraft_servers WHERE group_key=? ORDER BY last_seen_at DESC LIMIT 1 FOR UPDATE",
      [groupKey],
    )) as [Array<{ group_key: string; last_seen_at: Date | string | null }>, unknown];
    if (!storeGroups[0] && !telemetry[0]) {
      return { ok: false as const, status: 404 as const, error: "Cụm máy chủ không tồn tại." };
    }
    const value = parsed.value;
    await connection.execute(
      `INSERT INTO store_groups (group_key,display_name,sort_order,is_active,created_by,updated_by)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),sort_order=VALUES(sort_order),is_active=VALUES(is_active),updated_by=VALUES(updated_by)`,
      [groupKey, value.displayName, value.sortOrder, value.active, actor.id, actor.id],
    );
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [actor.id, "store.group.update", "store_group", groupKey, `Cập nhật cụm Store ${value.displayName}`, JSON.stringify(value)],
    );
    const lastSeenAt = telemetry[0]?.last_seen_at
      ? new Date(telemetry[0].last_seen_at).toISOString()
      : null;
    return {
      ok: true as const,
      group: {
        key: groupKey,
        displayName: value.displayName,
        sortOrder: value.sortOrder,
        active: value.active,
        online: lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() < 30_000 : false,
        categoryCount: 0,
        packageCount: 0,
        lastSeenAt,
      },
    };
  });
}

export async function deleteStoreCategory(
  actor: PublicUser,
  id: number,
  db: StoreAdminDb = getPool(),
): Promise<{ ok: true } | Failure> {
  if (!canManageUsers(actor.roleName)) {
    return { ok: false, status: 403, error: "Ban khong co quyen xoa danh muc." };
  }
  if (!Number.isSafeInteger(id) || id < 1) {
    return { ok: false, status: 400, error: "Ma danh muc khong hop le." };
  }
  return transaction(db, async (connection) => {
    const [rows] = (await connection.query(
      "SELECT id,name FROM store_categories WHERE id=? LIMIT 1 FOR UPDATE",
      [id],
    )) as [Array<{ id: number; name: string }>, unknown];
    const category = rows[0];
    if (!category) {
      return { ok: false as const, status: 404 as const, error: "Khong tim thay danh muc." };
    }
    const [counts] = (await connection.query(
      "SELECT COUNT(*) package_count FROM store_packages WHERE category_id=?",
      [id],
    )) as [Array<{ package_count: number }>, unknown];
    if (Number(counts[0]?.package_count) > 0) {
      return { ok: false as const, status: 409 as const, error: "Hay chuyen cac goi khoi danh muc truoc khi xoa." };
    }
    await connection.execute("DELETE FROM store_categories WHERE id=?", [id]);
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary) VALUES (?,?,?,?,?)",
      [actor.id, "store.category.delete", "store_category", String(id), `Xoa danh muc ${category.name}`],
    );
    return { ok: true as const };
  });
}

export async function deleteStorePackage(
  actor: PublicUser,
  id: number,
  db: StoreAdminDb = getPool(),
): Promise<{ ok: true; imagePath: string | null } | Failure> {
  if (!canManageUsers(actor.roleName)) {
    return { ok: false, status: 403, error: "Bạn không có quyền xóa gói nạp." };
  }
  if (!Number.isSafeInteger(id) || id < 1) {
    return { ok: false, status: 400, error: "Mã gói không hợp lệ." };
  }
  return transaction(db, async (connection) => {
    const [rows] = (await connection.query(
      "SELECT id,name,image_path FROM store_packages WHERE id=? LIMIT 1 FOR UPDATE",
      [id],
    )) as [Array<{ id: number; name: string; image_path: string | null }>, unknown];
    const storePackage = rows[0];
    if (!storePackage) {
      return { ok: false as const, status: 404 as const, error: "Không tìm thấy gói nạp." };
    }
    await connection.execute("DELETE FROM store_packages WHERE id=?", [id]);
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary) VALUES (?,?,?,?,?)",
      [actor.id, "store.package.delete", "store_package", String(id), `Xóa gói ${storePackage.name}`],
    );
    return { ok: true as const, imagePath: storePackage.image_path };
  });
}

export async function approveStoreOrder(
  actor: PublicUser,
  orderId: number,
  db: StoreAdminDb = getPool(),
  now = new Date(),
): Promise<{ ok: true; deliveryId: number; command: string } | Failure> {
  if (!canManageUsers(actor.roleName))
    return {
      ok: false,
      status: 403,
      error: "Bạn không có quyền duyệt đơn hàng.",
    };
  if (!Number.isSafeInteger(orderId) || orderId < 1)
    return { ok: false, status: 400, error: "Mã đơn không hợp lệ." };
  return transaction(db, async (connection) => {
    const [rows] = (await connection.query(
      `SELECT o.id,o.reference,o.status,o.package_name,o.package_slug,o.price_vnd,o.group_key,o.minecraft_username,o.command_template_snapshot
      FROM store_orders o WHERE o.id=? LIMIT 1 FOR UPDATE`,
      [orderId],
    )) as [Array<Record<string, unknown>>, unknown];
    const order = rows[0];
    if (!order)
      return {
        ok: false as const,
        status: 404 as const,
        error: "Không tìm thấy đơn hàng.",
      };
    if (order.status !== "pending_payment")
      return {
        ok: false as const,
        status: 409 as const,
        error: "Đơn hàng này không còn chờ duyệt.",
      };
    if (typeof order.command_template_snapshot !== "string")
      return {
        ok: false as const,
        status: 409 as const,
        error: "Đơn cũ chưa có bản chụp lệnh nên cần kiểm tra thủ công.",
      };
    const command = renderStoreCommand(order.command_template_snapshot, {
      player: String(order.minecraft_username),
      package: String(order.package_slug),
      amount: String(order.price_vnd),
      cluster: String(order.group_key),
    });
    const [deliveryResult] = await connection.execute(
      "INSERT INTO store_command_deliveries (order_id,group_key,command_text,status) VALUES (?,?,?,'pending')",
      [orderId, String(order.group_key), command],
    );
    const deliveryId = Number(
      (deliveryResult as { insertId?: number }).insertId,
    );
    await connection.execute(
      "UPDATE store_orders SET status='approved',approved_by=?,approved_at=?,updated_at=? WHERE id=?",
      [actor.id, now, now, orderId],
    );
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)",
      [
        actor.id,
        "store.order.approve",
        "store_order",
        String(orderId),
        `Duyệt đơn ${order.reference}`,
        JSON.stringify({
          deliveryId,
          groupKey: order.group_key,
          minecraftUsername: order.minecraft_username,
        }),
      ],
    );
    return { ok: true as const, deliveryId, command };
  });
}

export async function cancelStoreOrder(
  actor: PublicUser,
  orderId: number,
  db: StoreAdminDb = getPool(),
): Promise<{ ok: true } | Failure> {
  if (!canManageUsers(actor.roleName))
    return {
      ok: false,
      status: 403,
      error: "Bạn không có quyền hủy đơn hàng.",
    };
  if (!Number.isSafeInteger(orderId) || orderId < 1)
    return { ok: false, status: 400, error: "Mã đơn không hợp lệ." };
  return transaction(db, async (connection) => {
    const [rows] = (await connection.query(
      "SELECT reference,status FROM store_orders WHERE id=? LIMIT 1 FOR UPDATE",
      [orderId],
    )) as [Array<Record<string, unknown>>, unknown];
    if (!rows[0])
      return {
        ok: false as const,
        status: 404 as const,
        error: "Không tìm thấy đơn hàng.",
      };
    if (rows[0].status !== "pending_payment")
      return {
        ok: false as const,
        status: 409 as const,
        error: "Chỉ có thể hủy đơn đang chờ thanh toán.",
      };
    await connection.execute(
      "UPDATE store_orders SET status='cancelled' WHERE id=?",
      [orderId],
    );
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary) VALUES (?,?,?,?,?)",
      [
        actor.id,
        "store.order.cancel",
        "store_order",
        String(orderId),
        `Hủy đơn ${rows[0].reference}`,
      ],
    );
    return { ok: true as const };
  });
}
