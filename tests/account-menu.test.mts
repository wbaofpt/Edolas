import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("account menu presents role identity and a permission-aware control-center entry", async () => {
  const source = await readFile(new URL("../components/account-menu.tsx", import.meta.url), "utf8");
  assert.match(source, /account-role-badge/);
  assert.match(source, /canAccessAdmin/);
  assert.match(source, /href="\/control"/);
  assert.match(source, /Control Center/);
  assert.match(source, /account-menu-link/);
});
