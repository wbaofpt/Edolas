import test from "node:test";
import assert from "node:assert/strict";
import { parseWikiCluster, parseWikiPage } from "../lib/wiki/validation.ts";
import { createWikiPage, getWikiAdminPageById, listAllWikiPages, listPublishedWikiPages } from "../lib/wiki/service.ts";

test("wiki validators normalize valid cluster and page inputs", () => {
  assert.deepEqual(parseWikiCluster({ name: " Sinh tồn ", slug: "sinh-ton", description: " Hướng dẫn Survival ", accent: "violet", sortOrder: 20 }), { ok: true, value: { name: "Sinh tồn", slug: "sinh-ton", description: "Hướng dẫn Survival", accent: "violet", sortOrder: 20 } });
  assert.equal(parseWikiCluster({ name: "Test", slug: "Không hợp lệ", description: "x", accent: "red", sortOrder: 0 }).ok, false);
  assert.equal(parseWikiPage({ clusterId: 1, title: "Bài", slug: "bai", summary: "x", body: "short", isPublished: true, sortOrder: 0 }).ok, false);
});

test("wiki page creation rejects a cluster that does not exist", async () => {
  const result = await createWikiPage(9, { clusterId: 99, title: "Hướng dẫn mới", slug: "huong-dan-moi", summary: "Tóm tắt hướng dẫn", body: "Nội dung hướng dẫn đủ dài để xuất bản.", isPublished: true, sortOrder: 0 }, {
    query: async () => [[], undefined] as const,
    execute: async () => [{ insertId: 0, affectedRows: 0 }, undefined] as const
  });
  assert.deepEqual(result, { ok: false, status: 400, error: "Cụm Wiki không tồn tại." });
});

test("published wiki listing filters by cluster slug and maps database rows", async () => {
  let params: unknown[] = [];
  const pages = await listPublishedWikiPages("sinh-ton", {
    query: async (_sql, values) => { params = values as unknown[]; return [[{ id: 2, slug: "kinh-te", title: "Kinh tế", summary: "Giao dịch", cluster_slug: "sinh-ton", cluster_name: "Sinh tồn", updated_at: "2026-08-12" }], undefined] as const; },
    execute: async () => [{}, undefined] as const
  });
  assert.deepEqual(params, ["sinh-ton"]);
  assert.equal(pages[0]?.clusterSlug, "sinh-ton");
  assert.equal(pages[0]?.title, "Kinh tế");
});

test("public wiki queries exclude trashed pages", async () => {
  let sql = "";
  await listPublishedWikiPages(undefined, {
    query: async (statement) => { sql = statement; return [[], undefined] as const; },
    execute: async () => [{}, undefined] as const
  });
  assert.match(sql, /wp\.deleted_at IS NULL/);
});

test("admin wiki listing applies search, cluster and publication filters as parameters", async () => {
  let sql = "";
  let params: unknown[] = [];
  await listAllWikiPages({ query: "farm", clusterId: 2, status: "published" }, {
    query: async (statement, values) => { sql = statement; params = values as unknown[]; return [[], undefined] as const; },
    execute: async () => [{}, undefined] as const
  });
  assert.match(sql, /wp\.title LIKE \?/);
  assert.match(sql, /wp\.cluster_id = \?/);
  assert.match(sql, /wp\.is_published = \?/);
  assert.match(sql, /wp\.deleted_at IS NULL/);
  assert.doesNotMatch(sql, /wp\.body/);
  assert.deepEqual(params, ["%farm%", "%farm%", 2, true]);
});

test("admin wiki detail returns full body for the dedicated editor", async () => {
  let sql = "";
  const page = await getWikiAdminPageById(7, {
    query: async (statement, values) => {
      sql = statement;
      assert.deepEqual(values, [7]);
      return [[{ id: 7, cluster_id: 2, slug: "farm", title: "Farm", summary: "Hướng dẫn farm", body: "Nội dung đầy đủ cho trình chỉnh sửa.", is_published: 1, sort_order: 4, updated_at: "2026-08-12", cluster_slug: "sinh-ton", cluster_name: "Sinh tồn" }], undefined] as const;
    },
    execute: async () => [{}, undefined] as const
  });
  assert.equal(page?.body, "Nội dung đầy đủ cho trình chỉnh sửa.");
  assert.equal(page?.clusterId, 2);
  assert.match(sql, /wp\.deleted_at IS NULL/);
});

test("creating a wiki page attaches newly uploaded media owned by its author", async () => {
  const calls: Array<{ sql: string; values?: unknown }> = [];
  const result = await createWikiPage(9, { clusterId: 2, title: "Ảnh minh họa", slug: "anh-minh-hoa", summary: "Hướng dẫn có ảnh minh họa", body: "Nội dung đủ dài.\n\n[[image:/uploads/wiki/guide.webp|Bản đồ]]", isPublished: true, sortOrder: 0 }, {
    query: async () => [[], undefined] as const,
    execute: async (sql, values) => { calls.push({ sql: String(sql), values }); return calls.length === 1 ? [{ insertId: 17, affectedRows: 1 }, undefined] as const : [{ affectedRows: 1 }, undefined] as const; }
  });
  assert.deepEqual(result, { ok: true, pageId: 17 });
  assert.match(calls[1]?.sql ?? "", /UPDATE wiki_media SET page_id/);
  assert.deepEqual(calls[1]?.values, [17, "/uploads/wiki/guide.webp", 9]);
});

test("a failed media attachment does not report a created page as failed", async () => {
  let calls = 0;
  const result = await createWikiPage(9, { clusterId: 2, title: "Ảnh minh họa", slug: "anh-minh-hoa-2", summary: "Hướng dẫn có ảnh minh họa", body: "Nội dung đủ dài.\n\n[[image:/uploads/wiki/guide.webp|Bản đồ]]", isPublished: true, sortOrder: 0 }, {
    query: async () => [[], undefined] as const,
    execute: async () => { calls += 1; if (calls === 2) throw new Error("metadata unavailable"); return [{ insertId: 18, affectedRows: 1 }, undefined] as const; }
  });
  assert.deepEqual(result, { ok: true, pageId: 18 });
});
