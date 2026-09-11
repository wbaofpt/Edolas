import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("community migration defines profile, follow, forum-like and clustered wiki storage", async () => {
  const sql = await readFile(new URL("../database/04_community.sql", import.meta.url), "utf8");

  assert.match(sql, /ADD COLUMN bio VARCHAR\(500\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_follows/i);
  assert.match(sql, /PRIMARY KEY \(follower_id, followed_id\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS forum_topic_likes/i);
  assert.match(sql, /PRIMARY KEY \(topic_id, user_id\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS wiki_clusters/i);
  assert.match(sql, /ADD COLUMN cluster_id BIGINT UNSIGNED/i);
  assert.match(sql, /ADD COLUMN is_published BOOLEAN/i);
});

