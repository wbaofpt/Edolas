import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteStorePackage,
  deleteStoreCategory,
  listStoreAdminData,
  saveStoreCategory,
  saveStoreGroup,
  saveStorePackage,
} from "../lib/store/admin-service.ts";

const actor = {
  id: 1,
  username: "owner",
  displayName: "Owner",
  roleName: "owner",
  avatarUrl: null,
};
const validPackage = {
  slug: "vip-survival",
  name: "VIP Survival",
  description: "Quyền lợi VIP trong cụm Survival.",
  groupKey: "survival",
  priceVnd: 100000,
  commandTemplate: "lp user {player} parent add vip",
  accent: "violet",
  sortOrder: 10,
  active: true,
};

function connectionWith(
  queryRows: Array<Array<Record<string, unknown>>> = [],
) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  let queryIndex = 0;
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined,
    query: async () => [queryRows[queryIndex++] ?? [], undefined],
    execute: async (sql: string, values: unknown[] = []) => {
      statements.push({ sql, values });
      return [{ affectedRows: 1, insertId: 12 }, undefined];
    },
  };
  return { connection, statements };
}

test("store package admin persists catalog metadata", async () => {
  const { connection, statements } = connectionWith([
    [{ group_key: "survival" }],
    [{ id: 4, group_key: "survival" }],
  ]);
  const result = await saveStorePackage(
    actor,
    { ...validPackage, categoryId: 4, badge: "Hot", featured: true },
    undefined,
    { getConnection: async () => connection } as never,
  );
  assert.deepEqual(result, { ok: true, id: 12 });
  const insert = statements.find((statement) =>
    statement.sql.includes("INSERT INTO store_packages"),
  );
  assert.ok(insert);
  assert.match(insert.sql, /category_id/);
  assert.match(insert.sql, /is_featured/);
  assert.ok(insert.values.includes(4));
  assert.ok(insert.values.includes("Hot"));
});

test("store category admin creates and refuses deletion while packages reference it", async () => {
  const create = connectionWith([[{ group_key: "survival" }]]);
  assert.deepEqual(
    await saveStoreCategory(
      actor,
      { groupKey: "survival", slug: "battle-pass", name: "Battle Pass", sortOrder: 3, active: true },
      undefined,
      { getConnection: async () => create.connection } as never,
    ),
    { ok: true, id: 12 },
  );
  assert.ok(
    create.statements.some((statement) =>
      statement.sql.includes("INSERT INTO store_categories"),
    ),
  );
  const categoryInsert = create.statements.find((statement) =>
    statement.sql.includes("INSERT INTO store_categories"),
  );
  assert.ok(categoryInsert?.values.includes("survival"));

  const remove = connectionWith([[{ id: 12 }], [{ package_count: 2 }]]);
  const result = await deleteStoreCategory(
    actor,
    12,
    { getConnection: async () => remove.connection } as never,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 409);
});

test("store package admin refuses a category owned by another group", async () => {
  const mismatch = connectionWith([
    [{ group_key: "survival" }],
    [{ id: 4, group_key: "skyblock" }],
  ]);
  const result = await saveStorePackage(
    actor,
    { ...validPackage, categoryId: 4 },
    undefined,
    { getConnection: async () => mismatch.connection } as never,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 409);
  assert.equal(
    mismatch.statements.some((statement) => statement.sql.includes("INSERT INTO store_packages")),
    false,
  );
});

test("store admin lists package-only groups and can update their metadata", async () => {
  const queries: string[] = [];
  const data = await listStoreAdminData({
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes("known.group_key")) {
        return [[{
          group_key: "legacy-store",
          display_name: "Legacy Store",
          sort_order: 2,
          is_active: 1,
          last_seen_at: null,
          online: 0,
          category_count: 1,
          package_count: 3,
        }], undefined];
      }
      return [[], undefined];
    },
  } as never);
  assert.equal(data.groups[0]?.key, "legacy-store");
  assert.match(queries.at(-1) ?? "", /SELECT group_key FROM store_groups/);

  const update = connectionWith([[{ group_key: "legacy-store" }], []]);
  const result = await saveStoreGroup(
    actor,
    "legacy-store",
    { displayName: "Legacy Realm", sortOrder: 3, active: true },
    { getConnection: async () => update.connection } as never,
  );
  assert.equal(result.ok, true);
  assert.ok(update.statements.some((item) => item.sql.includes("INSERT INTO store_groups")));
  assert.ok(update.statements.some((item) => item.sql.includes("admin_audit_logs")));
});

test("store admin payment activity is bounded and excludes raw provider payload", async () => {
  const queries: string[] = [];
  await listStoreAdminData({ query: async (sql: string) => {
    queries.push(sql);
    return [[], undefined];
  } } as never);
  const paymentQuery = queries.find((sql) => sql.includes("FROM store_payment_attempts"));
  assert.match(paymentQuery ?? "", /LIMIT 200/);
  assert.doesNotMatch(paymentQuery ?? "", /payload_json|sandbox_token_hash|qr_content/);
  assert.match(paymentQuery ?? "", /account_email_snapshot/);
});

test("store transaction releases its connection when begin fails", async () => {
  let released = false;
  let rolledBack = false;
  const connection = {
    beginTransaction: async () => {
      throw new Error("database unavailable");
    },
    commit: async () => undefined,
    rollback: async () => {
      rolledBack = true;
    },
    release: () => {
      released = true;
    },
    query: async () => [[{ group_key: "survival" }], undefined],
    execute: async () => [{ affectedRows: 1 }, undefined],
  };
  await assert.rejects(
    () =>
      saveStorePackage(actor, validPackage, undefined, {
        query: connection.query,
        getConnection: async () => connection,
      } as never),
    /database unavailable/,
  );
  assert.equal(rolledBack, true);
  assert.equal(released, true);
});

test("duplicate store package slugs return a bounded conflict", async () => {
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined,
    query: async () => [[{ group_key: "survival" }], undefined],
    execute: async () => { throw Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" }); },
  };
  const result = await saveStorePackage(actor, validPackage, undefined, { getConnection: async () => connection } as never);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 409);
});

test("store package deletion preserves order snapshots and returns its managed image", async () => {
  const remove = connectionWith([[
    { id: 12, name: "VIP Survival", image_path: "/uploads/store/packages/vip.webp" },
  ]]);
  const result = await deleteStorePackage(
    actor,
    12,
    { getConnection: async () => remove.connection } as never,
  );
  assert.deepEqual(result, {
    ok: true,
    imagePath: "/uploads/store/packages/vip.webp",
  });
  assert.ok(remove.statements.some((item) => item.sql.includes("DELETE FROM store_packages")));
  assert.ok(remove.statements.some((item) => item.values.includes("store.package.delete")));
});
