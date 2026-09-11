import test from "node:test";
import assert from "node:assert/strict";
import { createStoreOrder, listStoreCatalog } from "../lib/store/service.ts";

test("public store catalog maps categories, managed images and fulfilled sales", async () => {
  const db = { query: async (sql: string) => sql.includes("FROM store_groups")
    ? [[{ group_key: "survival", display_name: "Sinh Tồn Đại Chiến", sort_order: 2, active_backends: 1 }], undefined]
    : [[{
      id: 8, slug: "vip-survival", name: "VIP Survival", description: "Quyền lợi VIP.",
      group_key: "survival", price_vnd: 100000, accent: "violet", category_id: 3,
      category_slug: "rank", category_name: "Rank", image_path: "/uploads/store/packages/vip.webp",
      badge: "Hot", is_featured: 1, sold_count: 42, active_backends: 1,
    }], undefined] };
  const catalog = await listStoreCatalog(db as never, new Date("2026-08-14T10:00:00Z"));
  assert.deepEqual(catalog.groups, [{ key: "survival", displayName: "Sinh Tồn Đại Chiến", sortOrder: 2, online: true }]);
  assert.deepEqual(catalog.packages[0], {
    id: 8, slug: "vip-survival", name: "VIP Survival", description: "Quyền lợi VIP.",
    groupKey: "survival", priceVnd: 100000, accent: "violet", categoryId: 3,
    categorySlug: "rank", categoryName: "Rank", imagePath: "/uploads/store/packages/vip.webp",
    badge: "Hot", featured: true, soldCount: 42, online: true,
  });
});

test("public catalog joins categories only inside the package group", async () => {
  const sql: string[] = [];
  await listStoreCatalog({ query: async (statement: string) => {
    sql.push(statement);
    return [[], undefined];
  } } as never);
  const packageSql = sql.find((statement) => statement.includes("FROM store_packages"));
  assert.match(packageSql ?? "", /c\.group_key=p\.group_key/);
  assert.match(packageSql ?? "", /sg\.is_active=TRUE/);
});

test("order creation snapshots its package command without creating a delivery", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined,
    query: async () => [
      [
        {
          id: 4,
          slug: "vip-survival",
          name: "VIP Survival",
          price_vnd: 100000,
          group_key: "survival",
          command_template: "lp user {player} parent add vip",
          online: 1,
        },
      ],
      undefined,
    ],
    execute: async (sql: string, values: unknown[]) => {
      statements.push({ sql, values });
      return [{ insertId: 19 }, undefined];
    },
  };
  const result = await createStoreOrder(
    {
      id: 7,
      username: "member",
      displayName: "Member",
      roleName: "player",
      avatarUrl: null,
    },
    {
      packageId: 4,
      minecraftUsername: "QuocBaooo",
      paymentMethod: "bank",
    },
    {
      db: { getConnection: async () => connection } as never,
      now: new Date("2026-08-14T10:00:00Z"),
      reference: () => "EDO-ABCDEFGHIJ",
    },
  );
  assert.equal(result.ok, true);
  assert.match(statements[0].sql, /command_template_snapshot/);
  assert.ok(statements[0].values.includes("lp user {player} parent add vip"));
  assert.equal(
    statements.some((statement) =>
      statement.sql.includes("store_command_deliveries"),
    ),
    false,
  );
});

test("order creation rejects a package hidden by an inactive Store group", async () => {
  let rolledBack = false;
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => { rolledBack = true; },
    release: () => undefined,
    query: async () => [[], undefined],
    execute: async () => [{ insertId: 1 }, undefined],
  };
  const result = await createStoreOrder(
    { id: 7, username: "member", displayName: "Member", roleName: "player", avatarUrl: null },
    { packageId: 4, minecraftUsername: "QuocBaooo", paymentMethod: "bank" },
    { db: { getConnection: async () => connection } as never },
  );
  assert.equal(result.ok, false);
  assert.equal(rolledBack, true);
});
