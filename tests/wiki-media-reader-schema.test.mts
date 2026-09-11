import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyWikiMediaReaderMigration } from "../lib/wiki/media-reader-schema.ts";

test("wiki media-reader SQL defines durable media and reader identity storage", async () => {
  const sql = await readFile(new URL("../database/05_wiki_media_readers.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS wiki_media/i);
  assert.match(sql, /path VARCHAR\(255\) NOT NULL UNIQUE/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS wiki_page_readers/i);
  assert.match(sql, /PRIMARY KEY \(page_id, reader_hash\)/i);
  assert.match(sql, /last_heartbeat/i);
  assert.match(sql, /ON DELETE CASCADE/i);
});

test("wiki media-reader migration is replay safe", async () => {
  const statements: string[] = [];
  await applyWikiMediaReaderMigration({
    execute: async (sql: string) => { statements.push(sql); return [{ affectedRows: 0 }, undefined] as const; }
  } as never);
  assert.equal(statements.length, 2);
  assert.equal(statements.every((sql) => /CREATE TABLE IF NOT EXISTS/i.test(sql)), true);
});

