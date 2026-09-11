import type { Pool, PoolConnection } from "mysql2/promise";
import type { StoreAccent } from "./validation.ts";

type DemoCategory = {
  groupKey: "op-skyblock";
  slug: string;
  name: string;
  sortOrder: number;
};

type DemoPackage = {
  slug: string;
  name: string;
  description: string;
  groupKey: "op-skyblock";
  categorySlug: string;
  imagePath: string;
  badge: string | null;
  featured: boolean;
  priceVnd: number;
  commandTemplate: string;
  accent: StoreAccent;
  sortOrder: number;
};

export const STORE_DEMO_CATEGORIES = [
  { groupKey: "op-skyblock", slug: "hot-items", name: "Gói nổi bật", sortOrder: 0 },
  { groupKey: "op-skyblock", slug: "ranks", name: "Rank đặc quyền", sortOrder: 10 },
  { groupKey: "op-skyblock", slug: "items", name: "Vật phẩm", sortOrder: 20 },
  { groupKey: "op-skyblock", slug: "battle-pass", name: "Battle Pass", sortOrder: 30 },
  { groupKey: "op-skyblock", slug: "monthly", name: "Gói tháng", sortOrder: 40 },
] as const satisfies readonly DemoCategory[];

const IMAGES = {
  sunset: "/uploads/game-modes/1786548958536-a0a2334f-05c7-489c-98c3-fd4eadaa5e1e.png",
  skyblock: "/uploads/game-modes/1786548990427-46a20d2a-c96f-48cf-b792-a1b13f4d9726.png",
  fantasy: "/uploads/game-modes/1786575530488-c0f2ffef-a6aa-459d-aab8-c0b503064c23.png",
  cosmic: "/uploads/game-modes/1786575621090-888732ba-c427-4a07-9d08-4caaa2e004a4.png",
} as const;

const SAFE_DEMO_COMMAND =
  "say [Edolas Demo] {player} purchased {package} for {amount} VND on {cluster}";

export const STORE_DEMO_PACKAGES = [
  {
    slug: "starter-bundle",
    name: "Gói Khởi Hành",
    description: "Bộ khởi đầu gọn nhẹ dành cho người chơi mới làm quen với OP Skyblock.",
    groupKey: "op-skyblock",
    categorySlug: "hot-items",
    imagePath: IMAGES.sunset,
    badge: "Phổ biến",
    featured: true,
    priceVnd: 49_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "cyan",
    sortOrder: 0,
  },
  {
    slug: "monthly-card",
    name: "Thẻ Tháng Edolas",
    description: "Quyền lợi tháng dành cho người chơi hoạt động thường xuyên trên đảo.",
    groupKey: "op-skyblock",
    categorySlug: "monthly",
    imagePath: IMAGES.fantasy,
    badge: "Hot",
    featured: true,
    priceVnd: 119_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "violet",
    sortOrder: 10,
  },
  {
    slug: "vip-sky",
    name: "VIP Sky",
    description: "Gói đặc quyền cân bằng cho hành trình phát triển đảo và giao thương.",
    groupKey: "op-skyblock",
    categorySlug: "ranks",
    imagePath: IMAGES.skyblock,
    badge: "VIP",
    featured: true,
    priceVnd: 159_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "sapphire",
    sortOrder: 20,
  },
  {
    slug: "legend-sky",
    name: "Legend Sky",
    description: "Bậc đặc quyền cao cấp với nhận diện nổi bật dành cho người chơi lâu dài.",
    groupKey: "op-skyblock",
    categorySlug: "ranks",
    imagePath: IMAGES.cosmic,
    badge: "Best value",
    featured: true,
    priceVnd: 299_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "violet",
    sortOrder: 30,
  },
  {
    slug: "crystal-pack",
    name: "Kho Tinh Thể",
    description: "Gói vật phẩm mẫu để tăng tốc những nâng cấp quan trọng trên đảo.",
    groupKey: "op-skyblock",
    categorySlug: "items",
    imagePath: IMAGES.skyblock,
    badge: "Mới",
    featured: false,
    priceVnd: 79_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "ice",
    sortOrder: 40,
  },
  {
    slug: "island-upgrade",
    name: "Nâng Cấp Hòn Đảo",
    description: "Gói minh họa cho các nâng cấp quy mô và tiện ích quản lý đảo.",
    groupKey: "op-skyblock",
    categorySlug: "items",
    imagePath: IMAGES.sunset,
    badge: null,
    featured: false,
    priceVnd: 129_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "cyan",
    sortOrder: 50,
  },
  {
    slug: "battle-pass-season-03",
    name: "Battle Pass Season 03",
    description: "Hành trình phần thưởng theo mùa với các cột mốc dành cho cộng đồng.",
    groupKey: "op-skyblock",
    categorySlug: "battle-pass",
    imagePath: IMAGES.cosmic,
    badge: "Season 03",
    featured: true,
    priceVnd: 189_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "sapphire",
    sortOrder: 60,
  },
  {
    slug: "monthly-deluxe",
    name: "Monthly Deluxe",
    description: "Gói tháng cao cấp dành cho người chơi muốn trải nghiệm trọn mùa.",
    groupKey: "op-skyblock",
    categorySlug: "monthly",
    imagePath: IMAGES.fantasy,
    badge: "Giới hạn",
    featured: false,
    priceVnd: 359_000,
    commandTemplate: SAFE_DEMO_COMMAND,
    accent: "violet",
    sortOrder: 70,
  },
] as const satisfies readonly DemoPackage[];

type SeedDb = Pick<Pool, "getConnection">;
type SeedConnection = Pick<
  PoolConnection,
  "beginTransaction" | "query" | "execute" | "commit" | "rollback" | "release"
>;

export async function replaceStoreWithDemoCatalog(
  db: SeedDb,
  groupKey = "op-skyblock",
) {
  const connection = (await db.getConnection()) as SeedConnection;
  try {
    await connection.beginTransaction();
    const [groups] = (await connection.query(
      "SELECT group_key FROM minecraft_servers WHERE group_key=? LIMIT 1 FOR UPDATE",
      [groupKey],
    )) as [Array<{ group_key: string }>, unknown];
    if (!groups[0]) throw new Error(`Cụm ${groupKey} không tồn tại.`);

    await connection.execute(
      `INSERT INTO store_groups (group_key,display_name,sort_order,is_active)
       VALUES (?, 'OP Skyblock', 0, TRUE)
       ON DUPLICATE KEY UPDATE group_key=VALUES(group_key)`,
      [groupKey],
    );

    await connection.execute("DELETE FROM store_packages");
    await connection.execute("DELETE FROM store_categories");

    const categoryIds = new Map<string, number>();
    for (const category of STORE_DEMO_CATEGORIES) {
      const [result] = await connection.execute(
        "INSERT INTO store_categories (group_key,slug,name,sort_order,is_active) VALUES (?,?,?,?,TRUE)",
        [groupKey, category.slug, category.name, category.sortOrder],
      );
      categoryIds.set(
        category.slug,
        Number((result as { insertId?: number }).insertId),
      );
    }

    for (const item of STORE_DEMO_PACKAGES) {
      const categoryId = categoryIds.get(item.categorySlug);
      if (!categoryId) throw new Error(`Không tìm thấy danh mục ${item.categorySlug}.`);
      await connection.execute(
        `INSERT INTO store_packages
        (slug,name,description,group_key,category_id,image_path,badge,is_featured,price_vnd,command_template,accent,sort_order,is_active)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,TRUE)`,
        [item.slug, item.name, item.description, groupKey, categoryId, item.imagePath, item.badge, item.featured, item.priceVnd, item.commandTemplate, item.accent, item.sortOrder],
      );
    }

    await connection.commit();
    return {
      categories: STORE_DEMO_CATEGORIES.length,
      packages: STORE_DEMO_PACKAGES.length,
      groupKey,
    };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
