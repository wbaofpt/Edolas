import test from "node:test";
import assert from "node:assert/strict";
import { parseNewTopic } from "../lib/forum/validation.ts";
import { createTopic, getTopic, listRecentTopics, toggleTopicLike } from "../lib/forum/service.ts";

test("new topic validation requires a category, useful title and content", () => {
  assert.equal(parseNewTopic({ categoryId: 2, title: "Ngắn", content: "x" }).ok, false);
  assert.deepEqual(parseNewTopic({ categoryId: 2, title: " Hướng dẫn farm emerald ", content: " Nội dung hướng dẫn đủ dài cho cộng đồng. " }), { ok: true, value: { categoryId: 2, title: "Hướng dẫn farm emerald", content: "Nội dung hướng dẫn đủ dài cho cộng đồng." } });
});

test("createTopic verifies the category before inserting", async () => {
  const calls: string[] = [];
  const db = {
    query: async (sql: string) => { calls.push(sql); return [[{ id: 2 }], undefined] as const; },
    execute: async (sql: string) => { calls.push(sql); return [{ insertId: 31 }, undefined] as const; }
  };
  const result = await createTopic(9, { categoryId: 2, title: "Hướng dẫn farm emerald", content: "Nội dung hướng dẫn đủ dài." }, db);
  assert.deepEqual(result, { ok: true, topicId: 31 });
  assert.match(calls[1], /INSERT INTO forum_topics/);
});

test("topic likes toggle an existing database row", async () => {
  const calls: string[] = [];
  const db = {
    query: async (sql: string) => { calls.push(sql); return [sql.includes("forum_topics WHERE") ? [{ id: 4 }] : [{ found: 1 }], undefined] as const; },
    execute: async (sql: string) => { calls.push(sql); return [{ affectedRows: 1 }, undefined] as const; }
  };
  assert.deepEqual(await toggleTopicLike(4, 9, db), { ok: true, liked: false });
  assert.match(calls.at(-1) ?? "", /DELETE FROM forum_topic_likes/);
});

test("public forum queries exclude trashed topics", async () => {
  const sql: string[] = [];
  const db = { query: async (statement: string) => { sql.push(statement); return [[], undefined] as const; }, execute: async () => [{}, undefined] as const };
  await listRecentTopics(db);
  await getTopic(4, undefined, db);
  assert.match(sql[0] ?? "", /ft\.deleted_at IS NULL/);
  assert.match(sql[1] ?? "", /ft\.deleted_at IS NULL/);
});
