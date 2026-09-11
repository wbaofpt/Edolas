import test from "node:test";
import assert from "node:assert/strict";
import { createTopicHandler, createTopicLikeHandler } from "../lib/forum/http.ts";

test("creating a forum topic requires authentication", async () => {
  const handler = createTopicHandler({ getRequestUser: async () => null });
  const response = await handler(new Request("http://localhost/api/forum/topics", { method: "POST", body: "{}" }));
  assert.equal(response.status, 401);
});

test("like handler passes the route id and current user to the service", async () => {
  let pair: number[] = [];
  const handler = createTopicLikeHandler({
    getRequestUser: async () => ({ id: 9, username: "stone", displayName: "Stone", roleName: "player", avatarUrl: null }),
    toggleTopicLike: async (topicId, userId) => { pair = [topicId, userId]; return { ok: true, liked: true }; }
  });
  const response = await handler(new Request("http://localhost/api/forum/topics/4/like", { method: "POST" }), { params: { id: "4" } });
  assert.deepEqual(pair, [4, 9]);
  assert.equal(response.status, 200);
});

