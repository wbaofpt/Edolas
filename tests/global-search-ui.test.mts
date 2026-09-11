import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("site header exposes accessible global search with grouped navigation", async () => {
  const source = await readFile(new URL("../components/site-search.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /api\/search\?q=/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /Người dùng/);
  assert.match(source, /Sự kiện/);
  assert.match(source, /Diễn đàn/);
  assert.match(source, /Escape/);
  assert.match(css, /\.site-search/);
});
