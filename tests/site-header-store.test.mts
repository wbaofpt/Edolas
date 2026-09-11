import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("site header restores the classic flat navigation", async () => {
  const source = await readFile(
    new URL("../components/site-header.tsx", import.meta.url),
    "utf8",
  );
  const content = await readFile(
    new URL("../lib/content.ts", import.meta.url),
    "utf8",
  );
  const gameModesIndex = content.indexOf('{ href: "/game-modes"');
  const storeIndex = content.indexOf('{ href: "/store", label: "Nạp thẻ" }');
  const forumIndex = content.indexOf('{ href: "/forum"');

  assert.ok(gameModesIndex >= 0);
  assert.ok(storeIndex > gameModesIndex);
  assert.ok(forumIndex > storeIndex);
  assert.doesNotMatch(source, /filter\(\(item\) => item\.href !== "\/store"\)/);
  assert.match(source, /navItems\.map/);
  assert.match(source, /Discord/);
  assert.match(source, /usePathname/);
  assert.match(source, /aria-current/);
  assert.doesNotMatch(source, /site-store-cta/);
  assert.doesNotMatch(source, /communityOpen/);
  assert.doesNotMatch(source, /Cộng đồng/);
});
test("account menu links directly to private store orders", async () => {
  const source = await readFile(
    new URL("../components/account-menu.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /Đơn hàng của tôi/);
  assert.match(source, /\/store#orders/);
});
