import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getAdjacentWikiPages } from "../lib/wiki/navigation.ts";
import type { WikiPageSummary } from "../lib/wiki/service.ts";

const page = (id: number, slug: string): WikiPageSummary => ({ id, slug, title: `Bài ${id}`, summary: `Tóm tắt ${id}`, clusterSlug: "survival", clusterName: "Survival", updatedAt: "2026-08-12" });

test("cluster navigation derives the previous and next published pages", () => {
  const pages = [page(1, "one"), page(2, "two"), page(3, "three")];
  assert.deepEqual(getAdjacentWikiPages(pages, 2), { previous: pages[0], next: pages[2] });
  assert.deepEqual(getAdjacentWikiPages(pages, 1), { previous: null, next: pages[1] });
  assert.deepEqual(getAdjacentWikiPages(pages, 99), { previous: null, next: null });
});

test("wiki article loads and renders navigation for its current cluster", async () => {
  const [article, rail] = await Promise.all([
    readFile(new URL("../app/wiki/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/wiki/wiki-cluster-rail.tsx", import.meta.url), "utf8")
  ]);
  assert.match(article, /listPublishedWikiPages\(page\.clusterSlug\)/);
  assert.match(article, /WikiClusterRail/);
  assert.match(rail, /aria-current=.*page/);
  assert.match(rail, /Bài trước/);
  assert.match(rail, /Bài tiếp theo/);
  assert.match(rail, /wiki-cluster-rail/);
  assert.match(rail, /\{adjacent\}<\/aside>/);
});

test("cluster navigation is sticky on desktop and becomes a horizontal dock on mobile", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.wiki-article-layout/);
  assert.match(css, /\.wiki-cluster-rail[^}]*position:\s*sticky/s);
  assert.match(css, /@media\s*\(max-width:\s*959px\)[\s\S]*\.wiki-cluster-rail-list[^}]*overflow-x:\s*auto/);
});
