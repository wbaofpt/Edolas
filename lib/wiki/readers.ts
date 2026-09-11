import { createHash } from "node:crypto";
import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

export type WikiReaderIdentity = { userId: number; visitorId?: never } | { visitorId: string; userId?: never };
export type WikiReaderMetrics = { totalOpens: number; uniqueReaders: number; activeReaders: number };
type ReaderDb = Pick<Pool, "query" | "execute">;

const asNumber = (value: unknown) => Number(value) || 0;

export class WikiPageNotFoundError extends Error {}

export function hashWikiReaderIdentity(identity: WikiReaderIdentity) {
  const value = identity.userId ? `user:${identity.userId}` : `visitor:${identity.visitorId}`;
  return createHash("sha256").update(value).digest("hex");
}

export async function getWikiReaderMetrics(pageId: number, now = new Date(), db: ReaderDb = getPool()): Promise<WikiReaderMetrics> {
  const activeSince = new Date(now.getTime() - 60_000);
  const [rows] = await db.query(
    "SELECT COALESCE(SUM(open_count), 0) AS total_opens, COUNT(*) AS unique_readers, COALESCE(SUM(last_heartbeat >= ?), 0) AS active_readers FROM wiki_page_readers WHERE page_id = ?",
    [activeSince, pageId]
  ) as [Array<Record<string, unknown>>, unknown];
  const row = rows[0] ?? {};
  return { totalOpens: asNumber(row.total_opens), uniqueReaders: asNumber(row.unique_readers), activeReaders: asNumber(row.active_readers) };
}

export async function recordWikiOpen(pageId: number, identity: WikiReaderIdentity, now = new Date(), db: ReaderDb = getPool()) {
  const [pages] = await db.query("SELECT id FROM wiki_pages WHERE id = ? AND is_published = TRUE AND deleted_at IS NULL LIMIT 1", [pageId]) as [Array<{ id: number }>, unknown];
  if (!pages.length) throw new WikiPageNotFoundError("Bài Wiki không tồn tại hoặc chưa xuất bản.");
  await db.execute(
    "INSERT INTO wiki_page_readers (page_id, reader_hash, user_id, open_count, first_opened_at, last_opened_at, last_heartbeat) VALUES (?, ?, ?, 1, ?, ?, ?) ON DUPLICATE KEY UPDATE open_count = open_count + 1, user_id = COALESCE(VALUES(user_id), user_id), last_opened_at = VALUES(last_opened_at), last_heartbeat = VALUES(last_heartbeat)",
    [pageId, hashWikiReaderIdentity(identity), identity.userId ?? null, now, now, now]
  );
  return getWikiReaderMetrics(pageId, now, db);
}

export async function recordWikiHeartbeat(pageId: number, identity: WikiReaderIdentity, now = new Date(), db: ReaderDb = getPool()) {
  await db.execute(
    "INSERT INTO wiki_page_readers (page_id, reader_hash, user_id, open_count, first_opened_at, last_opened_at, last_heartbeat) SELECT id, ?, ?, 0, ?, ?, ? FROM wiki_pages WHERE id = ? AND is_published = TRUE AND deleted_at IS NULL ON DUPLICATE KEY UPDATE user_id = COALESCE(VALUES(user_id), user_id), last_heartbeat = VALUES(last_heartbeat)",
    [hashWikiReaderIdentity(identity), identity.userId ?? null, now, now, now, pageId]
  );
  return getWikiReaderMetrics(pageId, now, db);
}
