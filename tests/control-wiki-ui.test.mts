import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Wiki administration lives inside Control and uses Control mutation endpoints", async () => {
  const [page, editor, clusters, library, uploader] = await Promise.all([
    readFile(new URL("../app/control/(protected)/wiki/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/wiki/wiki-article-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/wiki/wiki-cluster-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/wiki/wiki-admin-library.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/wiki/wiki-media-uploader.tsx", import.meta.url), "utf8")
  ]);
  assert.match(page, /WikiAdminLibrary/);
  assert.match(page, /WikiClusterManager/);
  assert.match(page, /aria-current/);
  assert.match(page, /aria-hidden="true"/);
  assert.match(editor, /controlFetch/);
  assert.match(editor, /api\/control\/wiki\/pages/);
  assert.match(editor, /\/control\/wiki/);
  assert.match(clusters, /api\/control\/wiki\/clusters/);
  assert.match(library, /api\/control\/wiki\/pages/);
  assert.match(uploader, /x-control-csrf/);
  assert.match(uploader, /api\/control\/wiki\/media/);
});

test("legacy Wiki admin pages redirect and old mutation APIs are retired", async () => {
  const [page, createPage, editPage, oldApi] = await Promise.all([
    readFile(new URL("../app/wiki/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/wiki/admin/new/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/wiki/admin/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/wiki/pages/route.ts", import.meta.url), "utf8")
  ]);
  assert.match(page, /redirect\("\/control\/wiki/);
  assert.match(createPage, /redirect\("\/control\/wiki\/new"\)/);
  assert.match(editPage, /redirect\(`\/control\/wiki\/\$\{params\.id\}`\)/);
  assert.match(oldApi, /retiredWikiMutation/);
});
