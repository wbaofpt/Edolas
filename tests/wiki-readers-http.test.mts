import test from "node:test";
import assert from "node:assert/strict";
import { createWikiReaderHandler } from "../lib/wiki/readers-http.ts";

const metrics = { totalOpens: 5, uniqueReaders: 3, activeReaders: 1 };

test("anonymous wiki readers receive a private visitor cookie", async () => {
  let identity: { visitorId?: string; userId?: number } = {};
  const handler = createWikiReaderHandler({
    getRequestUser: async () => null,
    recordOpen: async (_id, received) => { identity = received; return metrics; },
    recordHeartbeat: async () => metrics
  });
  const response = await handler(new Request("http://localhost/api/wiki/pages/4/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "open" }) }), { params: { id: "4" } });
  assert.equal(response.status, 200);
  assert.ok(identity.visitorId);
  assert.match(response.headers.get("set-cookie") ?? "", /edolas_wiki_visitor=.*HttpOnly.*SameSite=lax/i);
});

test("signed-in wiki readers use their account id and heartbeat action", async () => {
  let receivedEvent = "";
  let receivedUser = 0;
  const handler = createWikiReaderHandler({
    getRequestUser: async () => ({ id: 12, username: "reader12", displayName: "Reader", roleName: "player", avatarUrl: null }),
    recordOpen: async () => metrics,
    recordHeartbeat: async (_id, identity) => { receivedEvent = "heartbeat"; receivedUser = identity.userId ?? 0; return metrics; }
  });
  const response = await handler(new Request("http://localhost/api/wiki/pages/8/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "heartbeat" }) }), { params: { id: "8" } });
  assert.equal(response.status, 200);
  assert.equal(receivedEvent, "heartbeat");
  assert.equal(receivedUser, 12);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("wiki reader endpoint rejects invalid page ids and events", async () => {
  const handler = createWikiReaderHandler({ getRequestUser: async () => null, recordOpen: async () => metrics, recordHeartbeat: async () => metrics });
  const badId = await handler(new Request("http://localhost", { method: "POST", body: JSON.stringify({ event: "open" }) }), { params: { id: "nope" } });
  const badEvent = await handler(new Request("http://localhost", { method: "POST", body: JSON.stringify({ event: "close" }) }), { params: { id: "3" } });
  assert.equal(badId.status, 400);
  assert.equal(badEvent.status, 400);
});

test("malformed visitor cookies are replaced instead of throwing", async () => {
  const handler = createWikiReaderHandler({ getRequestUser: async () => null, recordOpen: async () => metrics, recordHeartbeat: async () => metrics });
  const response = await handler(new Request("http://localhost", { method: "POST", headers: { cookie: "edolas_wiki_visitor=%" }, body: JSON.stringify({ event: "open" }) }), { params: { id: "3" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie") ?? "", /edolas_wiki_visitor=/);
});

test("wiki reader endpoint throttles excessive client events", async () => {
  const handler = createWikiReaderHandler({ getRequestUser: async () => null, allowRequest: () => false, recordOpen: async () => metrics, recordHeartbeat: async () => metrics });
  const response = await handler(new Request("http://localhost", { method: "POST", body: JSON.stringify({ event: "open" }) }), { params: { id: "3" } });
  assert.equal(response.status, 429);
});
