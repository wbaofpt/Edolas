import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("expanded content center exposes search, filters, selection, and specialist actions", async () => {
  const source = await read("components/admin/admin-content-table.tsx");
  assert.match(source, /Tìm nội dung/);
  assert.match(source, /Chọn tất cả/);
  assert.match(source, /Thao tác hàng loạt/);
  assert.match(source, /Ghim bài|Bỏ ghim/);
  assert.match(source, /Xuất bản|Chuyển thành bản nháp/);
  assert.match(source, /Xem trước media/);
});

test("control navigation includes category and session operations for account admins", async () => {
  const source = await read("components/admin/admin-shell.tsx");
  assert.match(source, /Danh mục/);
  assert.match(source, /Phiên đăng nhập/);
  assert.match(source, /userAdmin: true/);
});

test("audit page offers actor, action, target, and date filters", async () => {
  const source = await read("app/control/(protected)/audit/page.tsx");
  assert.match(source, /name="actor"/);
  assert.match(source, /name="action"/);
  assert.match(source, /name="target"/);
  assert.match(source, /name="from"/);
  assert.match(source, /name="to"/);
});
