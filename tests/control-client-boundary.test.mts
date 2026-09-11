import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Control browser helpers do not import the Node crypto session module", async () => {
  const client = await readFile(new URL("../lib/control/client.ts", import.meta.url), "utf8");
  assert.match(client, /\.\/constants/);
  assert.doesNotMatch(client, /\.\/session/);
  assert.doesNotMatch(client, /node:crypto/);
});
