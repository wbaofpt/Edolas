import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  STORE_DEMO_CATEGORIES,
  STORE_DEMO_PACKAGES,
  replaceStoreWithDemoCatalog,
} from "../lib/store/demo-seed.ts";

test("demo catalog defines five categories and eight safe image-led packages", () => {
  assert.equal(STORE_DEMO_CATEGORIES.length, 5);
  assert.equal(STORE_DEMO_PACKAGES.length, 8);
  assert.equal(new Set(STORE_DEMO_CATEGORIES.map((item) => item.slug)).size, 5);
  assert.equal(new Set(STORE_DEMO_PACKAGES.map((item) => item.slug)).size, 8);
  const categorySlugs = new Set(STORE_DEMO_CATEGORIES.map((item) => item.slug));
  assert.ok(STORE_DEMO_CATEGORIES.every((item) => item.groupKey === "op-skyblock"));
  for (const item of STORE_DEMO_PACKAGES) {
    assert.equal(categorySlugs.has(item.categorySlug), true);
    assert.match(item.imagePath, /^\/uploads\/game-modes\/[A-Za-z0-9._-]+\.png$/);
    assert.match(item.commandTemplate, /^say /);
    assert.equal(item.groupKey, "op-skyblock");
  }
  assert.ok(STORE_DEMO_PACKAGES.filter((item) => item.featured).length >= 3);
});

function database(groupExists = true) {
  const statements: Array<{ kind: "query" | "execute"; sql: string; values: unknown[] }> = [];
  let insertId = 100;
  let committed = false;
  let rolledBack = false;
  let released = false;
  const connection = {
    beginTransaction: async () => undefined,
    query: async (sql: string, values: unknown[] = []) => {
      statements.push({ kind: "query", sql, values });
      return [groupExists ? [{ group_key: "op-skyblock" }] : [], undefined];
    },
    execute: async (sql: string, values: unknown[] = []) => {
      statements.push({ kind: "execute", sql, values });
      return [{ affectedRows: 1, insertId: insertId++ }, undefined];
    },
    commit: async () => { committed = true; },
    rollback: async () => { rolledBack = true; },
    release: () => { released = true; },
  };
  return {
    db: { getConnection: async () => connection },
    statements,
    state: () => ({ committed, rolledBack, released }),
  };
}

test("demo seed replaces only catalog tables in one transaction", async () => {
  const fake = database();
  const result = await replaceStoreWithDemoCatalog(fake.db as never);
  assert.deepEqual(result, { categories: 5, packages: 8, groupKey: "op-skyblock" });
  const sql = fake.statements.map((item) => item.sql);
  assert.ok(sql.some((item) => item.includes("INSERT INTO store_groups")));
  const groupLookup = sql.findIndex((item) => item.includes("FROM minecraft_servers"));
  const packageDelete = sql.findIndex((item) => item === "DELETE FROM store_packages");
  const categoryDelete = sql.findIndex((item) => item === "DELETE FROM store_categories");
  assert.ok(groupLookup >= 0 && groupLookup < packageDelete);
  assert.ok(packageDelete < categoryDelete);
  assert.equal(sql.some((item) => /DELETE FROM store_(orders|command_deliveries)/.test(item)), false);
  assert.equal(sql.filter((item) => item.includes("INSERT INTO store_categories")).length, 5);
  assert.ok(
    fake.statements
      .filter((item) => item.sql.includes("INSERT INTO store_categories"))
      .every((item) => item.values[0] === "op-skyblock"),
  );
  assert.equal(sql.filter((item) => item.includes("INSERT INTO store_packages")).length, 8);
  assert.deepEqual(fake.state(), { committed: true, rolledBack: false, released: true });
});

test("demo seed aborts before catalog deletion when the target group is missing", async () => {
  const fake = database(false);
  await assert.rejects(
    () => replaceStoreWithDemoCatalog(fake.db as never),
    /op-skyblock.*không tồn tại/i,
  );
  assert.equal(fake.statements.some((item) => item.sql.startsWith("DELETE FROM")), false);
  assert.deepEqual(fake.state(), { committed: false, rolledBack: true, released: true });
});

test("demo seed CLI is available as a package command", async () => {
  const script = await readFile(new URL("../scripts/seed-store-demo.mts", import.meta.url), "utf8");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(script, /replaceStoreWithDemoCatalog/);
  assert.match(script, /finally/);
  assert.match(script, /pool\.end/);
  assert.match(pkg.scripts["db:seed:store-demo"], /seed-store-demo/);
});
