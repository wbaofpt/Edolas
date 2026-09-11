import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("account management can request reset email without exposing a password", async () => {
  const source = await read("components/admin/admin-user-table.tsx");
  assert.match(source, /request-password-reset/);
  assert.match(source, /Gửi email đặt lại mật khẩu/);
  assert.doesNotMatch(source, /name="newPassword"/);
});

test("public reset screen submits token and a new password", async () => {
  const [page, form] = await Promise.all([read("app/reset-password/page.tsx"), read("components/auth/reset-password-form.tsx")]);
  assert.match(page, /searchParams/);
  assert.match(form, /api\/auth\/reset-password/);
  assert.match(form, /autoComplete="new-password"/);
  assert.match(form, /aria-live="polite"/);
});
