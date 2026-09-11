import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveDatabaseUrl } from "../lib/db.ts";

test("database configuration requires an explicit DATABASE_URL", async () => {
  assert.throws(() => resolveDatabaseUrl({}), /DATABASE_URL/);
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: " mysql://user:secret@db/edolas " }), "mysql://user:secret@db/edolas");
  const source = await readFile(new URL("../lib/db.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /mysql:\/\/sa:123456/);
  assert.match(source, /globalThis/);
  assert.match(source, /edolasMysqlPool/);
});
