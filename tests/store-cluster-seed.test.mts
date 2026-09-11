import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("store migration seeds the four independent cluster catalogs", async () => {
  const source = await readFile(
    new URL("../lib/store/schema.ts", import.meta.url),
    "utf8",
  );
  for (const key of ["op-skyblock", "survival", "fantasy-skyblock", "smp"]) {
    assert.match(source, new RegExp(`key: "${key}"`));
  }
  assert.match(source, /STORE_GROUP_SEEDS/);
  assert.match(source, /STORE_CATEGORY_SEEDS/);
  assert.match(source, /INSERT IGNORE INTO store_groups/);
  assert.match(source, /INSERT IGNORE INTO store_categories/);
});

test("each new cluster receives its own starter category set", async () => {
  const source = await readFile(
    new URL("../lib/store/schema.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /groupKey: "survival", slug: "ranks"/);
  assert.match(source, /groupKey: "survival", slug: "items"/);
  assert.match(source, /groupKey: "survival", slug: "utilities"/);
  assert.match(source, /groupKey: "fantasy-skyblock", slug: "ranks"/);
  assert.match(source, /groupKey: "fantasy-skyblock", slug: "crates"/);
  assert.match(source, /groupKey: "fantasy-skyblock", slug: "battle-pass"/);
  assert.match(source, /groupKey: "smp", slug: "ranks"/);
  assert.match(source, /groupKey: "smp", slug: "cosmetics"/);
  assert.match(source, /groupKey: "smp", slug: "bundles"/);
});
