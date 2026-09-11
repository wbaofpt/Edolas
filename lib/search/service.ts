import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

export type SearchDb = Pick<Pool, "query">;
export type SiteSearchResults = {
  users: Array<{ id: number; username: string; displayName: string; avatarUrl: string | null }>;
  events: Array<{ id: number; title: string; summary: string; date: string }>;
  forum: Array<{ id: number; title: string; category: string; replies: number; likes: number }>;
};

const limit = 5;
const number = (value: unknown) => Number(value) || 0;

export async function searchSite(term: string, db: SearchDb = getPool()): Promise<SiteSearchResults> {
  const normalized = term.trim().slice(0, 80);
  if (normalized.length < 2) return { users: [], events: [], forum: [] };
  const like = `%${normalized}%`;
  const [[userRows], [eventRows], [forumRows]] = await Promise.all([
    db.query(`SELECT id,username,display_name,avatar_url FROM users
      WHERE account_status='active' AND (username LIKE ? OR CAST(id AS CHAR) LIKE ?)
      ORDER BY username LIMIT ${limit}`, [like, like]),
    db.query(`SELECT id,title,body,published_at FROM announcements
      WHERE deleted_at IS NULL AND (title LIKE ? OR body LIKE ?)
      ORDER BY published_at DESC LIMIT ${limit}`, [like, like]),
    db.query(`SELECT ft.id,ft.title,fc.title category,ft.replies_count replies,COUNT(ftl.user_id) likes
      FROM forum_topics ft INNER JOIN forum_categories fc ON fc.id=ft.category_id
      LEFT JOIN forum_topic_likes ftl ON ftl.topic_id=ft.id
      WHERE ft.deleted_at IS NULL AND (ft.title LIKE ? OR ft.content LIKE ? OR fc.title LIKE ?)
      GROUP BY ft.id,ft.title,fc.title,ft.replies_count,ft.updated_at
      ORDER BY ft.is_pinned DESC,ft.updated_at DESC LIMIT ${limit}`, [like, like, like]),
  ]) as [
    [Array<Record<string, unknown>>, unknown],
    [Array<Record<string, unknown>>, unknown],
    [Array<Record<string, unknown>>, unknown],
  ];
  return {
    users: userRows.map((row) => ({ id: number(row.id), username: String(row.username), displayName: String(row.display_name), avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null })),
    events: eventRows.map((row) => ({ id: number(row.id), title: String(row.title), summary: String(row.body).slice(0, 140), date: new Intl.DateTimeFormat("vi-VN").format(new Date(row.published_at as string | Date)) })),
    forum: forumRows.map((row) => ({ id: number(row.id), title: String(row.title), category: String(row.category), replies: number(row.replies), likes: number(row.likes) })),
  };
}
