import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("wiki reader loads clusters and preserves cluster selection in the URL", async () => {
  const page = await readFile(new URL("../app/wiki/page.tsx", import.meta.url), "utf8");
  const browser = await readFile(new URL("../components/wiki/wiki-browser.tsx", import.meta.url), "utf8");
  assert.match(page, /listWikiClusters/);
  assert.match(page, /searchParams/);
  assert.match(browser, /\?cluster=/);
  assert.doesNotMatch(page, /wikiCards/);
});

test("wiki admin exposes cluster and article management", async () => {
  const clusters = await readFile(new URL("../components/wiki/wiki-cluster-manager.tsx", import.meta.url), "utf8");
  const editor = await readFile(new URL("../components/wiki/wiki-article-editor.tsx", import.meta.url), "utf8");
  const library = await readFile(new URL("../components/wiki/wiki-admin-library.tsx", import.meta.url), "utf8");
  assert.match(clusters, /\/api\/control\/wiki\/clusters/);
  assert.match(editor, /\/api\/control\/wiki\/pages/);
  assert.match(clusters, /controlFetch/);
  assert.match(editor, /controlFetch/);
  assert.match(editor, /isPublished/);
  assert.match(library, /"DELETE"/);
  assert.doesNotMatch(editor, /Nhập lại nội dung đầy đủ khi chỉnh sửa/);
});
