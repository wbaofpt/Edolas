import test from "node:test";
import assert from "node:assert/strict";
import { getProfileByUsername, listOwnLikedTopics, listProfileConnections, toggleFollow } from "../lib/profile/service.ts";

function dbWithQuery(rowsBySql: (sql: string) => unknown[]) {
  return { query: async (sql: string) => [rowsBySql(sql), undefined] as const, execute: async () => [{ affectedRows: 1 }, undefined] as const };
}

test("profile service returns database-derived social and forum counts", async () => {
  const profile = await getProfileByUsername("stonecrafter", 9, dbWithQuery((sql) => {
    if (sql.includes("FROM users u")) return [{ id: 9, username: "stonecrafter", display_name: "Stone Crafter", role_name: "player", avatar_url: null, bio: "Builder", created_at: new Date("2026-01-02"), posts_count: 4, likes_count: 17, followers_count: 8, following_count: 3, is_following: 0 }];
    return [];
  }));

  assert.equal(profile?.stats.posts, 4);
  assert.equal(profile?.stats.likes, 17);
  assert.equal(profile?.stats.followers, 8);
  assert.equal(profile?.isOwner, true);
});

test("follow toggle rejects self-follow before touching the database", async () => {
  let calls = 0;
  const result = await toggleFollow(9, 9, { query: async () => { calls += 1; return [[], undefined] as const; }, execute: async () => { calls += 1; return [{ affectedRows: 0 }, undefined] as const; } });
  assert.deepEqual(result, { ok: false, status: 400, error: "Bạn không thể theo dõi chính mình." });
  assert.equal(calls, 0);
});

test("liked topics are private when the viewer is not the profile owner", async () => {
  let calls = 0;
  const result = await listOwnLikedTopics(9, 10, {
    query: async () => { calls += 1; return [[], undefined] as const; },
    execute: async () => { calls += 1; return [{ affectedRows: 0 }, undefined] as const; },
  });
  assert.deepEqual(result, []);
  assert.equal(calls, 0);
});

test("liked topics query is available only for the signed-in profile owner", async () => {
  let statement = "";
  const result = await listOwnLikedTopics(9, 9, {
    query: async (sql: string) => { statement = sql; return [[], undefined] as const; },
    execute: async () => [{ affectedRows: 0 }, undefined] as const,
  });
  assert.deepEqual(result, []);
  assert.match(statement, /forum_topic_likes own_like/);
  assert.match(statement, /own_like\.user_id = \?/);
});

test("profile connections map followers and following from separate database queries", async () => {
  let queryIndex = 0;
  const db = dbWithQuery(() => {
    queryIndex += 1;
    return queryIndex === 1
      ? [{ username: "skywanderer", display_name: "Sky Wanderer", avatar_url: null, role_name: "player" }]
      : [{ username: "edolas_admin", display_name: "Edolas Admin", avatar_url: "/avatars/admin.png", role_name: "staff" }];
  });
  const result = await listProfileConnections(9, db);
  assert.equal(result.followers[0]?.username, "skywanderer");
  assert.equal(result.following[0]?.roleName, "staff");
});
