import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin shell exposes clear role-aware control-center navigation", async () => {
  const source = await read("components/admin/admin-shell.tsx");
  assert.match(source, /EDOLAS NETWORK/);
  assert.match(source, /CONTROL NODE/);
  assert.match(source, /Tổng quan/);
  assert.match(source, /Thành viên/);
  assert.match(source, /Nội dung/);
  assert.match(source, /Nhật ký/);
  assert.match(source, /Cài đặt/);
  assert.match(source, /aria-label="Điều hướng quản trị"/);
  assert.match(source, /canManageUsers/);
  assert.match(source, /canManageSettings/);
});

test("dashboard provides operational KPIs, health and recent activity", async () => {
  const source = await read("components/admin/admin-dashboard.tsx");
  assert.match(source, /Tổng thành viên/);
  assert.match(source, /Phiên hoạt động/);
  assert.match(source, /Trong thùng rác/);
  assert.match(source, /Tình trạng hệ thống/);
  assert.match(source, /Hoạt động gần đây/);
  assert.match(source, /Bài đang ghim/);
  assert.match(source, /Wiki bản nháp/);
  assert.match(source, /Media chưa gắn/);
  assert.match(source, /Sắp đến hạn xóa/);
});

test("member and content tables include accessible filters and confirmations", async () => {
  const [users, content] = await Promise.all([
    read("components/admin/admin-user-table.tsx"),
    read("components/admin/admin-content-table.tsx")
  ]);
  assert.match(users, /aria-label="Tìm thành viên"/);
  assert.match(users, /Khóa tài khoản/);
  assert.match(users, /Vô hiệu hóa/);
  assert.match(users, /Từ 1 đến 365 ngày/);
  assert.match(users, /actor\.roleName === "owner"/);
  assert.match(users, /Thu hồi phiên/);
  assert.match(users, /role="dialog"/);
  assert.match(content, /Thùng rác/);
  assert.match(content, /XOA VINH VIEN/);
  assert.match(content, /role="dialog"/);
});

test("settings form keeps secrets out and labels every editable field", async () => {
  const source = await read("components/admin/admin-settings-form.tsx");
  assert.match(source, /Tên máy chủ/);
  assert.match(source, /IP kết nối/);
  assert.match(source, /IP Bedrock/);
  assert.match(source, /Cổng Bedrock/);
  assert.match(source, /Discord/);
  assert.match(source, /Chế độ bảo trì/);
  assert.doesNotMatch(source, /app password|gmail_app_password/i);
});

test("all control routes are protected by the independent nested layout", async () => {
  const source = await read("app/control/(protected)/layout.tsx");
  assert.match(source, /requireControlUser/);
  assert.match(source, /AdminShell/);
});
