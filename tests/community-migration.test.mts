import test from "node:test";
import assert from "node:assert/strict";
import { applyCommunityMigration } from "../lib/community/schema.ts";

test("community migration skips existing columns and remains safe to replay", async () => {
  const executed: string[] = [];
  const existing = new Map([
    ["users", ["id", "bio"]],
    ["forum_topics", ["id", "views_count", "created_at"]],
    ["wiki_pages", ["id", "cluster_id", "author_id", "is_published", "sort_order", "created_at", "updated_at"]]
  ]);
  const db = {
    query: async (sql: string, params?: unknown[]) => {
      if (sql.includes("information_schema.COLUMNS")) {
        return [(existing.get(String(params?.[0])) ?? []).map((COLUMN_NAME) => ({ COLUMN_NAME })), undefined] as const;
      }
      return [[], undefined] as const;
    },
    execute: async (sql: string) => { executed.push(sql); return [{ affectedRows: 0 }, undefined] as const; }
  };

  await applyCommunityMigration(db as never);

  assert.equal(executed.some((sql) => /ADD COLUMN bio/i.test(sql)), false);
  assert.equal(executed.some((sql) => /ADD COLUMN views_count/i.test(sql)), false);
  assert.equal(executed.some((sql) => /CREATE TABLE IF NOT EXISTS user_follows/i.test(sql)), true);
  assert.equal(executed.some((sql) => /CREATE TABLE IF NOT EXISTS wiki_clusters/i.test(sql)), true);
});

