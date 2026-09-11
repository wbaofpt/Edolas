import test from "node:test";
import assert from "node:assert/strict";
import { createForumMediaUploadHandler } from "../lib/forum/media-http.ts";

test("forum media upload requires a signed-in account", async () => {
  const handler = createForumMediaUploadHandler({ getRequestUser: async () => null });
  const response = await handler(new Request("http://localhost/api/forum/media", { method: "POST" }));
  assert.equal(response.status, 401);
});

test("forum media upload enforces multipart size before parsing", async () => {
  const handler = createForumMediaUploadHandler({ getRequestUser: async () => ({ id: 2, username: "user", displayName: "User", roleName: "player", avatarUrl: null }) });
  const response = await handler(new Request("http://localhost/api/forum/media", { method: "POST", headers: { "content-length": String(51 * 1024 * 1024 + 1) } }));
  assert.equal(response.status, 413);
});
