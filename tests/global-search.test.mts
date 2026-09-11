import test from "node:test";
import assert from "node:assert/strict";
import { searchSite } from "../lib/search/service.ts";
import { createSearchHandler } from "../lib/search/http.ts";

test("global search returns users, events and forum topics with bounded parameters", async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const result = await searchSite("42", {
    query: async (sql: string, values: unknown[]) => {
      queries.push({ sql, values });
      if (sql.includes("FROM users")) return [[{ id: 42, username: "player42", display_name: "Player 42", avatar_url: null }], undefined];
      if (sql.includes("FROM announcements")) return [[{ id: 3, title: "Sự kiện mùa 3", body: "Mở cửa cuối tuần", published_at: new Date("2026-08-14") }], undefined];
      return [[{ id: 8, title: "Tìm đồng đội", category: "Cộng đồng", replies: 2, likes: 4 }], undefined];
    },
  } as never);
  assert.equal(result.users[0]?.id, 42);
  assert.equal(result.events[0]?.id, 3);
  assert.equal(result.forum[0]?.id, 8);
  assert.equal(queries.length, 3);
  assert.ok(queries.every(({ values }) => values.length <= 3));
});

test("short global search terms do not query the database", async () => {
  let calls = 0;
  assert.deepEqual(await searchSite("a", { query: async () => { calls += 1; return [[], undefined]; } } as never), { users: [], events: [], forum: [] });
  assert.equal(calls, 0);
});

test("global search HTTP endpoint rejects oversized terms and returns safe groups", async () => {
  const handler = createSearchHandler({ search: async () => ({ users: [], events: [], forum: [] }) });
  const response = await handler(new Request("https://edolas.test/api/search?q=a"));
  assert.equal(response.status, 400);
  const valid = await handler(new Request("https://edolas.test/api/search?q=survival"));
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { ok: true, results: { users: [], events: [], forum: [] } });
});
