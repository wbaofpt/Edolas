import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

export type ForumDb = Pick<Pool, "query" | "execute">;
export type ForumCategory = { id: number; slug: string; title: string; description: string; topics: number };
export type ForumTopicSummary = { id: number; title: string; category: string; author: string | null; replies: number; likes: number; updatedAt: Date | string };
export type ForumComment = { id: number; topicId: number; parentId: number | null; authorId: number; author: string; username: string; avatarUrl: string | null; content: string; likes: number; liked: boolean; createdAt: Date | string; children: ForumComment[] };
export type ForumTopicDetail = ForumTopicSummary & { content: string; authorUsername: string | null; avatarUrl: string | null; views: number; shares: number; liked: boolean; comments: ForumComment[] };
const number = (value: unknown) => Number(value) || 0;

export async function listForumCategories(db: ForumDb = getPool()): Promise<ForumCategory[]> {
  const [rows] = await db.query(`SELECT fc.id, fc.slug, fc.title, fc.description, COUNT(ft.id) AS topics FROM forum_categories fc LEFT JOIN forum_topics ft ON ft.category_id = fc.id AND ft.deleted_at IS NULL GROUP BY fc.id, fc.slug, fc.title, fc.description, fc.sort_order ORDER BY fc.sort_order, fc.title`) as [Array<Record<string, unknown>>, unknown];
  return rows.map((r) => ({ id: number(r.id), slug: String(r.slug), title: String(r.title), description: String(r.description), topics: number(r.topics) }));
}

export async function listRecentTopics(db: ForumDb = getPool()): Promise<ForumTopicSummary[]> {
  const [rows] = await db.query(`SELECT ft.id, ft.title, fc.title AS category, u.display_name AS author, ft.replies_count AS replies, COUNT(ftl.user_id) AS likes, ft.updated_at FROM forum_topics ft INNER JOIN forum_categories fc ON fc.id = ft.category_id LEFT JOIN users u ON u.id = ft.author_id LEFT JOIN forum_topic_likes ftl ON ftl.topic_id = ft.id WHERE ft.deleted_at IS NULL GROUP BY ft.id, ft.title, fc.title, u.display_name, ft.replies_count, ft.updated_at ORDER BY ft.is_pinned DESC, ft.updated_at DESC LIMIT 50`) as [Array<Record<string, unknown>>, unknown];
  return rows.map((r) => ({ id: number(r.id), title: String(r.title), category: String(r.category), author: r.author ? String(r.author) : null, replies: number(r.replies), likes: number(r.likes), updatedAt: r.updated_at as Date | string }));
}

export async function createTopic(userId: number, input: { categoryId: number; title: string; content: string }, db: ForumDb = getPool()) {
  const [categories] = await db.query("SELECT id FROM forum_categories WHERE id = ? LIMIT 1", [input.categoryId]) as [Array<{ id: number }>, unknown];
  if (!categories[0]) return { ok: false as const, status: 400 as const, error: "Chuyên mục không tồn tại." };
  const [result] = await db.execute("INSERT INTO forum_topics (category_id, author_id, title, content) VALUES (?, ?, ?, ?)", [input.categoryId, userId, input.title, input.content]);
  return { ok: true as const, topicId: Number((result as { insertId: number }).insertId) };
}

export async function getTopic(topicId: number, viewerId?: number, db: ForumDb = getPool()): Promise<ForumTopicDetail | null> {
  const [rows] = await db.query(`SELECT ft.id, ft.title, ft.content, ft.replies_count AS replies, ft.views_count AS views, ft.shares_count AS shares, ft.updated_at, fc.title AS category, u.display_name AS author, u.username AS author_username, u.avatar_url, COUNT(ftl.user_id) AS likes, EXISTS(SELECT 1 FROM forum_topic_likes own WHERE own.topic_id = ft.id AND own.user_id = ?) AS liked FROM forum_topics ft INNER JOIN forum_categories fc ON fc.id = ft.category_id LEFT JOIN users u ON u.id = ft.author_id LEFT JOIN forum_topic_likes ftl ON ftl.topic_id = ft.id WHERE ft.id = ? AND ft.deleted_at IS NULL GROUP BY ft.id, ft.title, ft.content, ft.replies_count, ft.views_count, ft.shares_count, ft.updated_at, fc.title, u.display_name, u.username, u.avatar_url LIMIT 1`, [viewerId ?? 0, topicId]) as [Array<Record<string, unknown>>, unknown];
  const r = rows[0]; if (!r) return null;
  await db.execute("UPDATE forum_topics SET views_count = views_count + 1 WHERE id = ?", [topicId]);
  const [commentRows] = await db.query(`SELECT c.id,c.topic_id,c.parent_id,c.author_id,c.content,c.created_at,u.display_name AS author,u.username,u.avatar_url,COUNT(cl.user_id) AS likes,EXISTS(SELECT 1 FROM forum_comment_likes own WHERE own.comment_id=c.id AND own.user_id=?) AS liked FROM forum_comments c INNER JOIN users u ON u.id=c.author_id LEFT JOIN forum_comment_likes cl ON cl.comment_id=c.id WHERE c.topic_id=? AND c.deleted_at IS NULL GROUP BY c.id,c.topic_id,c.parent_id,c.author_id,c.content,c.created_at,u.display_name,u.username,u.avatar_url ORDER BY c.created_at ASC`, [viewerId ?? 0, topicId]) as [Array<Record<string, unknown>>, unknown];
  const comments = commentRows.map((row) => ({ id: number(row.id), topicId: number(row.topic_id), parentId: row.parent_id == null ? null : number(row.parent_id), authorId: number(row.author_id), author: String(row.author), username: String(row.username), avatarUrl: row.avatar_url ? String(row.avatar_url) : null, content: String(row.content), likes: number(row.likes), liked: Boolean(number(row.liked)), createdAt: row.created_at as Date | string, children: [] as ForumComment[] }));
  const byId = new Map(comments.map((comment) => [comment.id, comment])); const roots: ForumComment[] = [];
  for (const comment of comments) { const parent = comment.parentId ? byId.get(comment.parentId) : undefined; (parent?.children ?? roots).push(comment); }
  return { id: number(r.id), title: String(r.title), content: String(r.content), category: String(r.category), author: r.author ? String(r.author) : null, authorUsername: r.author_username ? String(r.author_username) : null, avatarUrl: r.avatar_url ? String(r.avatar_url) : null, replies: number(r.replies), likes: number(r.likes), shares: number(r.shares), views: number(r.views) + 1, liked: Boolean(number(r.liked)), comments: roots, updatedAt: r.updated_at as Date | string };
}

export async function createForumComment(topicId: number, userId: number, input: { content: string; parentId: number | null }, db: ForumDb = getPool()) {
  const [topics] = await db.query("SELECT id FROM forum_topics WHERE id=? AND deleted_at IS NULL LIMIT 1", [topicId]) as [Array<{ id: number }>, unknown];
  if (!topics[0]) return { ok: false as const, status: 404 as const, error: "Không tìm thấy bài viết." };
  if (input.parentId) { const [parents] = await db.query("SELECT id FROM forum_comments WHERE id=? AND topic_id=? AND deleted_at IS NULL LIMIT 1", [input.parentId, topicId]) as [Array<{ id: number }>, unknown]; if (!parents[0]) return { ok: false as const, status: 400 as const, error: "Bình luận gốc không hợp lệ." }; }
  const [result] = await db.execute("INSERT INTO forum_comments (topic_id,parent_id,author_id,content) VALUES (?,?,?,?)", [topicId, input.parentId, userId, input.content]);
  await db.execute("UPDATE forum_topics SET replies_count=replies_count+1,updated_at=CURRENT_TIMESTAMP WHERE id=?", [topicId]);
  return { ok: true as const, commentId: Number((result as { insertId: number }).insertId) };
}

export async function toggleCommentLike(commentId: number, userId: number, db: ForumDb = getPool()) {
  const [comments] = await db.query("SELECT id FROM forum_comments WHERE id=? AND deleted_at IS NULL LIMIT 1", [commentId]) as [Array<{ id: number }>, unknown];
  if (!comments[0]) return { ok: false as const, status: 404 as const, error: "Không tìm thấy bình luận." };
  const [existing] = await db.query("SELECT 1 AS found FROM forum_comment_likes WHERE comment_id=? AND user_id=? LIMIT 1", [commentId, userId]) as [Array<{ found: number }>, unknown];
  if (existing[0]) { await db.execute("DELETE FROM forum_comment_likes WHERE comment_id=? AND user_id=?", [commentId, userId]); return { ok: true as const, liked: false }; }
  await db.execute("INSERT INTO forum_comment_likes (comment_id,user_id) VALUES (?,?)", [commentId, userId]); return { ok: true as const, liked: true };
}

export async function shareTopic(topicId: number, db: ForumDb = getPool()) { const [result] = await db.execute("UPDATE forum_topics SET shares_count=shares_count+1 WHERE id=? AND deleted_at IS NULL", [topicId]); if (!(result as { affectedRows: number }).affectedRows) return { ok: false as const, status: 404 as const, error: "Không tìm thấy bài viết." }; return { ok: true as const }; }

export async function deleteTopic(topicId: number, userId: number, db: ForumDb = getPool()) { const [result] = await db.execute("UPDATE forum_topics SET deleted_at=CURRENT_TIMESTAMP,deleted_by=? WHERE id=? AND author_id=? AND deleted_at IS NULL", [userId, topicId, userId]); if (!(result as { affectedRows: number }).affectedRows) return { ok: false as const, status: 403 as const, error: "Bạn không có quyền xóa bài viết này." }; return { ok: true as const }; }

export async function deleteForumComment(commentId: number, userId: number, db: ForumDb = getPool()) { const [result] = await db.execute("UPDATE forum_comments SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND author_id=? AND deleted_at IS NULL", [commentId, userId]); if (!(result as { affectedRows: number }).affectedRows) return { ok: false as const, status: 403 as const, error: "Bạn không có quyền xóa bình luận này." }; return { ok: true as const }; }

export async function toggleTopicLike(topicId: number, userId: number, db: ForumDb = getPool()) {
  const [topics] = await db.query("SELECT id FROM forum_topics WHERE id = ? AND deleted_at IS NULL LIMIT 1", [topicId]) as [Array<{ id: number }>, unknown];
  if (!topics[0]) return { ok: false as const, status: 404 as const, error: "Không tìm thấy bài viết." };
  const [existing] = await db.query("SELECT 1 AS found FROM forum_topic_likes WHERE topic_id = ? AND user_id = ? LIMIT 1", [topicId, userId]) as [Array<{ found: number }>, unknown];
  if (existing[0]) { await db.execute("DELETE FROM forum_topic_likes WHERE topic_id = ? AND user_id = ?", [topicId, userId]); return { ok: true as const, liked: false }; }
  await db.execute("INSERT INTO forum_topic_likes (topic_id, user_id) VALUES (?, ?)", [topicId, userId]); return { ok: true as const, liked: true };
}
