import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

export type ProfileDb = Pick<Pool, "query" | "execute">;

type ProfileRow = {
  id: number;
  username: string;
  display_name: string;
  role_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: Date | string;
  posts_count: number | string;
  likes_count: number | string;
  followers_count: number | string;
  following_count: number | string;
  is_following: number | string;
};

export type ProfileView = {
  id: number;
  username: string;
  displayName: string;
  roleName: string;
  avatarUrl: string | null;
  bio: string;
  createdAt: Date | string;
  isOwner: boolean;
  isFollowing: boolean;
  stats: { posts: number; likes: number; followers: number; following: number };
};

export type ProfileTopic = {
  id: number;
  title: string;
  category: string;
  replies: number;
  likes: number;
  updatedAt: Date | string;
};
export type ProfileMember = { username: string; displayName: string; avatarUrl: string | null; roleName: string };

function count(value: number | string) {
  return Number(value) || 0;
}

export async function getProfileByUsername(username: string, viewerId?: number, db: ProfileDb = getPool()): Promise<ProfileView | null> {
  const [rows] = (await db.query(
    `
      SELECT
        u.id, u.username, u.display_name, u.role_name, u.avatar_url, u.bio, u.created_at,
        (SELECT COUNT(*) FROM forum_topics ft WHERE ft.author_id = u.id AND ft.deleted_at IS NULL) AS posts_count,
        (SELECT COUNT(*) FROM forum_topic_likes ftl INNER JOIN forum_topics ft ON ft.id = ftl.topic_id WHERE ft.author_id = u.id AND ft.deleted_at IS NULL) AS likes_count,
        (SELECT COUNT(*) FROM user_follows uf WHERE uf.followed_id = u.id) AS followers_count,
        (SELECT COUNT(*) FROM user_follows uf WHERE uf.follower_id = u.id) AS following_count,
        EXISTS(SELECT 1 FROM user_follows uf WHERE uf.follower_id = ? AND uf.followed_id = u.id) AS is_following
      FROM users u
      WHERE LOWER(u.username) = LOWER(?)
      LIMIT 1
    `,
    [viewerId ?? 0, username]
  )) as [ProfileRow[], unknown];

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    roleName: row.role_name,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? "",
    createdAt: row.created_at,
    isOwner: row.id === viewerId,
    isFollowing: Boolean(Number(row.is_following)),
    stats: {
      posts: count(row.posts_count),
      likes: count(row.likes_count),
      followers: count(row.followers_count),
      following: count(row.following_count)
    }
  };
}

export async function updateOwnProfile(userId: number, displayName: string, bio: string, db: ProfileDb = getPool()) {
  await db.execute("UPDATE users SET display_name = ?, bio = ? WHERE id = ?", [displayName, bio || null, userId]);
}

export async function updateAvatarPath(userId: number, avatarUrl: string, db: ProfileDb = getPool()) {
  const [rows] = (await db.query("SELECT avatar_url FROM users WHERE id = ? LIMIT 1", [userId])) as [Array<{ avatar_url: string | null }>, unknown];
  await db.execute("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId]);
  return rows[0]?.avatar_url ?? null;
}

export async function toggleFollow(followerId: number, followedId: number, db: ProfileDb = getPool()) {
  if (followerId === followedId) {
    return { ok: false as const, status: 400 as const, error: "Bạn không thể theo dõi chính mình." };
  }

  const [users] = (await db.query("SELECT id FROM users WHERE id = ? LIMIT 1", [followedId])) as [Array<{ id: number }>, unknown];
  if (!users[0]) return { ok: false as const, status: 404 as const, error: "Không tìm thấy tài khoản." };

  const [existing] = (await db.query("SELECT 1 AS found FROM user_follows WHERE follower_id = ? AND followed_id = ? LIMIT 1", [followerId, followedId])) as [Array<{ found: number }>, unknown];
  if (existing[0]) {
    await db.execute("DELETE FROM user_follows WHERE follower_id = ? AND followed_id = ?", [followerId, followedId]);
    return { ok: true as const, following: false };
  }

  await db.execute("INSERT INTO user_follows (follower_id, followed_id) VALUES (?, ?)", [followerId, followedId]);
  return { ok: true as const, following: true };
}

export async function listProfileTopics(userId: number, liked = false, db: ProfileDb = getPool()): Promise<ProfileTopic[]> {
  const join = liked ? "INNER JOIN forum_topic_likes own_like ON own_like.topic_id = ft.id AND own_like.user_id = ?" : "";
  const where = liked ? "1 = 1" : "ft.author_id = ?";
  const [rows] = (await db.query(
    `SELECT ft.id, ft.title, fc.title AS category, ft.replies_count AS replies,
      COUNT(ftl.user_id) AS likes, ft.updated_at
     FROM forum_topics ft
     ${join}
     INNER JOIN forum_categories fc ON fc.id = ft.category_id
     LEFT JOIN forum_topic_likes ftl ON ftl.topic_id = ft.id
     WHERE ${where} AND ft.deleted_at IS NULL
     GROUP BY ft.id, ft.title, fc.title, ft.replies_count, ft.updated_at
     ORDER BY ft.updated_at DESC
     LIMIT 30`,
    [userId]
  )) as [Array<{ id: number; title: string; category: string; replies: number; likes: number | string; updated_at: Date | string }>, unknown];

  return rows.map((row) => ({ id: row.id, title: row.title, category: row.category, replies: row.replies, likes: count(row.likes), updatedAt: row.updated_at }));
}

/** Liked topics are private account activity, never public profile content. */
export async function listOwnLikedTopics(
  profileOwnerId: number,
  viewerId: number | undefined,
  db: ProfileDb = getPool(),
): Promise<ProfileTopic[]> {
  if (viewerId !== profileOwnerId) return [];
  return listProfileTopics(profileOwnerId, true, db);
}

export async function listProfileConnections(userId: number, db: ProfileDb = getPool()) {
  const [followerRows] = await db.query(`SELECT u.username, u.display_name, u.avatar_url, u.role_name FROM user_follows uf INNER JOIN users u ON u.id = uf.follower_id WHERE uf.followed_id = ? ORDER BY uf.created_at DESC LIMIT 24`, [userId]) as [Array<{ username:string; display_name:string; avatar_url:string|null; role_name:string }>, unknown];
  const [followingRows] = await db.query(`SELECT u.username, u.display_name, u.avatar_url, u.role_name FROM user_follows uf INNER JOIN users u ON u.id = uf.followed_id WHERE uf.follower_id = ? ORDER BY uf.created_at DESC LIMIT 24`, [userId]) as [Array<{ username:string; display_name:string; avatar_url:string|null; role_name:string }>, unknown];
  const map = (rows: typeof followerRows): ProfileMember[] => rows.map((row) => ({ username: row.username, displayName: row.display_name, avatarUrl: row.avatar_url, roleName: row.role_name }));
  return { followers: map(followerRows), following: map(followingRows) };
}
