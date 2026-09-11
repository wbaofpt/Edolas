import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStoreCategoryInput,
  parseStoreOrderInput,
  parseStorePackageInput,
  renderStoreCommand,
} from "../lib/store/validation.ts";

test("store category validation normalizes safe catalog metadata", () => {
  assert.deepEqual(
    parseStoreCategoryInput({ groupKey: "op-skyblock", slug: "battle-pass", name: "Battle Pass", sortOrder: 20, active: true }),
    { ok: true, value: { groupKey: "op-skyblock", slug: "battle-pass", name: "Battle Pass", sortOrder: 20, active: true } },
  );
  assert.equal(parseStoreCategoryInput({ slug: "bad slug", name: "Bad", sortOrder: 0, active: true }).ok, false);
});

test("store group input accepts a bounded Store-only display name", async () => {
  const validation = await import("../lib/store/validation.ts") as Record<string, unknown>;
  assert.equal(typeof validation.parseStoreGroupInput, "function");
  const parse = validation.parseStoreGroupInput as (value: unknown) => unknown;
  assert.deepEqual(parse({ displayName: "OP Skyblock Premium", sortOrder: 2, active: true }), {
    ok: true,
    value: { displayName: "OP Skyblock Premium", sortOrder: 2, active: true },
  });
});

test("store packages accept bounded category, badge and featured metadata", () => {
  const result = parseStorePackageInput({
    slug: "vip-survival", name: "VIP Survival", description: "Quyền lợi VIP.",
    groupKey: "survival", priceVnd: 100000, commandTemplate: "lp user {player} parent add vip",
    accent: "violet", sortOrder: 10, active: true, categoryId: 4, badge: "Hot", featured: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(
    { categoryId: result.value.categoryId, badge: result.value.badge, featured: result.value.featured },
    { categoryId: 4, badge: "Hot", featured: true },
  );
  assert.equal(parseStorePackageInput({
    slug: "vip-survival", name: "VIP Survival", description: "Quyền lợi VIP.",
    groupKey: "survival", priceVnd: 100000, commandTemplate: "say ok", accent: "cyan",
    sortOrder: 0, active: true, badge: "x".repeat(21),
  }).ok, false);
});

test("store package validation accepts one bounded console command with known variables", () => {
  const result = parseStorePackageInput({
    slug: "vip-survival",
    name: "VIP Survival",
    description: "Quyền lợi VIP trong cụm Survival.",
    groupKey: "survival",
    priceVnd: 100000,
    commandTemplate: "lp user {player} parent add vip",
    accent: "violet",
    sortOrder: 10,
    active: true,
  });
  assert.equal(result.ok, true);
});

test("store validation rejects unknown variables, newlines and invalid Minecraft names", () => {
  assert.equal(
    parseStorePackageInput({
      slug: "vip",
      name: "VIP",
      description: "VIP",
      groupKey: "survival",
      priceVnd: 1,
      commandTemplate: "op {unknown}",
      accent: "cyan",
      sortOrder: 0,
      active: true,
    }).ok,
    false,
  );
  assert.equal(
    parseStorePackageInput({
      slug: "vip",
      name: "VIP",
      description: "VIP",
      groupKey: "survival",
      priceVnd: 1,
      commandTemplate: "say one\nsay two",
      accent: "cyan",
      sortOrder: 0,
      active: true,
    }).ok,
    false,
  );
  assert.equal(
    parseStoreOrderInput({
      packageId: 1,
      minecraftUsername: "Tên Có Dấu",
      paymentMethod: "momo",
    }).ok,
    false,
  );
});

test("store command renderer replaces every approved variable and strips a leading slash", () => {
  const command = renderStoreCommand("/give {player} diamond {amount}", {
    player: "QuocBaooo",
    package: "vip-survival",
    amount: "16",
    cluster: "survival",
  });
  assert.equal(command, "give QuocBaooo diamond 16");
  assert.throws(
    () =>
      renderStoreCommand("{player}".repeat(64), {
        player: "SixteenCharsName",
        package: "vip-survival",
        amount: "16",
        cluster: "survival",
      }),
    /rendered command/i,
  );
});

test("store order validation accepts MoMo and bank only", () => {
  assert.equal(
    parseStoreOrderInput({
      packageId: 7,
      minecraftUsername: "QuocBaooo",
      paymentMethod: "bank",
    }).ok,
    true,
  );
  assert.equal(
    parseStoreOrderInput({
      packageId: 7,
      minecraftUsername: "QuocBaooo",
      paymentMethod: "card",
    }).ok,
    false,
  );
});
