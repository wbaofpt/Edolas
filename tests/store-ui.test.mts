import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("store page provides a four-step accessible simulated checkout", async () => {
  const source = await readFile(
    new URL("../components/store/storefront.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const page = await readFile(
    new URL("../app/store/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /Nhân vật/);
  assert.match(source, /Gói nạp/);
  assert.match(source, /Thanh toán/);
  assert.match(source, /Hoàn tất/);
  assert.match(source, /Nạp thẻ Edolas/);
  assert.match(source, /Chọn nhân vật nhận gói/);
  assert.match(source, /Tóm tắt đơn/);
  assert.match(source, /Kiểm tra và hoàn tất/);
  assert.match(source, /store-friendly-summary/);
  assert.match(source, /store-history/);
  assert.match(source, /store-featured-rail/);
  assert.match(source, /store-category-tabs/);
  assert.match(source, /item\.imagePath/);
  assert.match(source, /item\.soldCount/);
  assert.match(source, /item\.badge/);
  assert.match(source, /group\.displayName/);
  assert.match(source, /className="store-cluster-name"/);
  assert.match(source, /categoryFilter/);
  assert.match(source, /store-desktop-catalog/);
  assert.match(source, /matchMedia\("\(min-width: 1100px\)"\)/);
  assert.match(source, /Ví MoMo/);
  assert.match(source, /Ngân hàng/);
  assert.match(source, /aria-live/);
  assert.match(source, /aria-invalid/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /aria-current/);
  assert.match(source, /id="orders"/);
  assert.match(source, /Không chuyển tiền thật/);
  assert.match(source, /api\/store\/orders/);
  assert.match(source, /resumeTarget/);
  assert.match(source, /errorField === "username"/);
  assert.match(source, /errorField === "cluster"/);
  assert.match(source, /aria-describedby=\{/);
  assert.match(source, /stageHeadingRef/);
  assert.match(source, /useState\(resumedGroup\)/);
  assert.match(source, /useState\(resumedPackageId\)/);
  assert.doesNotMatch(source, /groups\[0\]\?\.key \?\? ""/);
  assert.doesNotMatch(
    source,
    /setPackageId\(packages\.find\(\(item\) => item\.groupKey === value\)\?\.id \?\? 0\)/,
  );
  assert.match(page, /searchParams/);
  assert.match(page, /resume: searchParams\?\.resume/);
  assert.match(page, /groups=\{catalog\?\.groups \?\? \[\]\}/);
  assert.doesNotMatch(
    source,
    /CHECKOUT SEQUENCE|PLAYER TARGET|PACKAGE MATRIX|PAYMENT CHANNEL|FINAL REVIEW|MY ORDERS/,
  );
  assert.match(styles, /\.store-friendly-summary/);
  assert.match(styles, /\.store-history/);
  assert.match(styles, /\.store-catalog-card/);
  assert.match(styles, /\.store-cluster-name\{[^}]*font-family:var\(--font-pixel\)/);
  assert.match(styles, /aspect-ratio/);
  assert.match(styles, /@media\(min-width:1100px\)/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /\.site-mobile-panel\{[^}]*max-height:[^;}]+;[^}]*overflow-y:auto/);
  assert.match(styles, /@media\(max-width:430px\)\{[^}]*\.store-checkout>footer\{display:grid/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
test("store page loads only public catalog and current account orders", async () => {
  const source = await readFile(
    new URL("../app/store/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /listStoreCatalog/);
  assert.match(source, /listUserStoreOrders/);
  assert.doesNotMatch(source, /commandTemplate/);
});
