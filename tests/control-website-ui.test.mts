import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("control website manager exposes all database-backed public resources", async () => {
  const [page, manager, shell] = await Promise.all([
    readFile(new URL("../app/control/(protected)/website/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/control/website-resource-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/admin-shell.tsx", import.meta.url), "utf8")
  ]);
  assert.match(page, /listWebsiteResources/);
  assert.match(manager, /Thông báo/);
  assert.match(manager, /Chế độ chơi/);
  assert.match(manager, /Nội quy/);
  assert.match(manager, /Thống kê/);
  assert.match(manager, /api\/control\/website/);
  assert.match(shell, /href: "\/control\/website"/);
});
