import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("Control Store exposes package management, order filters and deliberate approval", async () => {
  const source = await readFile(
    new URL("../components/control/store-manager.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(source, /PACKAGE EDITOR/);
  assert.match(source, /COMMAND PREVIEW/);
  assert.match(source, /Tất cả trạng thái/);
  assert.match(source, /Tất cả cụm/);
  assert.match(source, /Tất cả thanh toán/);
  assert.match(source, /dialog/);
  assert.match(source, /aria-labelledby/);
  assert.match(source, /commandTemplateSnapshot/);
  assert.match(source, /Nhập <strong>/);
  assert.match(source, /lệnh console thật/);
  assert.match(source, /controlFetch/);
  assert.match(source, /CATEGORY MANAGER/);
  assert.match(source, /store\/categories/);
  assert.match(source, /categoryId/);
  assert.match(source, /badge/);
  assert.match(source, /featured/);
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(source, /packages\/\$\{packageId\}\/image/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /StoreAdminGroup/);
  assert.match(source, /selectedGroupKey/);
  assert.match(source, /group\.displayName/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /categories\.filter\(\(category\) => category\.groupKey === selectedGroupKey\)/);
  assert.match(source, /store\/groups\/\$\{encodeURIComponent/);
  assert.match(source, /control-store-cluster-name/);
  assert.match(source, /control-store-group-dialog/);
  assert.match(source, /groupEditTriggerRef/);
  assert.match(source, /setCategories\(\(current\)[\s\S]+packageCount/);
  assert.match(source, /removePackage/);
  assert.match(source, /packages\/\$\{editor\.id\}/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /Xóa gói/);
  assert.match(source, /PAYMENT ACTIVITY/);
  assert.match(source, /payment\.accountEmail/);
  assert.match(source, /paymentProvider/);
  assert.match(source, /paymentStatus/);
  assert.match(styles, /\.control-store-cluster-name\{[^}]*font-family:var\(--font-pixel\)/);
  assert.match(styles, /\.control-store-group-dialog/);
});
test("Control navigation includes the account-admin Store workspace", async () => {
  const source = await readFile(
    new URL("../components/admin/admin-shell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /\/control\/store/);
  assert.match(source, /Cửa hàng/);
});
