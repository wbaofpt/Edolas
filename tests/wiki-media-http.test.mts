import test from "node:test";
import assert from "node:assert/strict";
import { createWikiMediaUploadHandler } from "../lib/wiki/media-http.ts";

test("wiki media upload requires staff authorization", async () => {
  const anonymous = createWikiMediaUploadHandler({ getRequestUser: async () => null });
  const player = createWikiMediaUploadHandler({ getRequestUser: async () => ({ id: 2, username: "player", displayName: "Player", roleName: "player", avatarUrl: null }) });
  const request = () => new Request("http://localhost/api/wiki/media", { method: "POST", body: new FormData() });
  assert.equal((await anonymous(request())).status, 401);
  assert.equal((await player(request())).status, 403);
});

test("wiki media upload rejects oversized request bodies before parsing multipart data", async () => {
  const handler = createWikiMediaUploadHandler({ getRequestUser: async () => ({ id: 2, username: "staff", displayName: "Staff", roleName: "staff", avatarUrl: null }) });
  const response = await handler(new Request("http://localhost/api/wiki/media", { method: "POST", headers: { "content-length": String(52 * 1024 * 1024) } }));
  assert.equal(response.status, 413);
});
