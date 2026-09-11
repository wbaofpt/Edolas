import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("wiki admin landing is a filterable article library with a separate cluster tab", async () => {
  const page = await readFile(new URL("../app/control/(protected)/wiki/page.tsx", import.meta.url), "utf8");
  const library = await readFile(new URL("../components/wiki/wiki-admin-library.tsx", import.meta.url), "utf8");
  assert.match(page, /searchParams/);
  assert.match(page, /tab=clusters/);
  assert.match(page, /listAllWikiPages\(filters/);
  assert.match(library, /name="query"/);
  assert.match(library, /name="cluster"/);
  assert.match(library, /name="status"/);
  assert.match(library, /\/control\/wiki\/new/);
  assert.match(library, /`\/control\/wiki\/\${page\.id}`/);
});

test("wiki article create and edit routes share a clearly labelled editor", async () => {
  const createPage = await readFile(new URL("../app/control/(protected)/wiki/new/page.tsx", import.meta.url), "utf8");
  const editPage = await readFile(new URL("../app/control/(protected)/wiki/[id]/page.tsx", import.meta.url), "utf8");
  const editor = await readFile(new URL("../components/wiki/wiki-article-editor.tsx", import.meta.url), "utf8");
  assert.match(createPage, /WikiArticleEditor/);
  assert.match(editPage, /getWikiAdminPageById/);
  assert.match(editor, /htmlFor="wiki-title"/);
  assert.match(editor, /htmlFor="wiki-body"/);
  assert.match(editor, /isPublished/);
  assert.match(editor, /router\.push\(`\/control\/wiki\/\${\w+\.pageId}`\)/);
});

test("destructive wiki actions use a named accessible confirmation dialog", async () => {
  const dialog = await readFile(new URL("../components/wiki/wiki-confirm-dialog.tsx", import.meta.url), "utf8");
  const library = await readFile(new URL("../components/wiki/wiki-admin-library.tsx", import.meta.url), "utf8");
  const clusters = await readFile(new URL("../components/wiki/wiki-cluster-manager.tsx", import.meta.url), "utf8");
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /onConfirm/);
  assert.match(library, /WikiConfirmDialog/);
  assert.match(clusters, /WikiConfirmDialog/);
});

test("cluster manager opens only one explicit create or edit form", async () => {
  const manager = await readFile(new URL("../components/wiki/wiki-cluster-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /setEditingId\("new"\)/);
  assert.match(manager, /Hủy/);
  assert.match(manager, /editingId === cluster\.id/);
  assert.match(manager, /Tạo cụm mới/);
});
