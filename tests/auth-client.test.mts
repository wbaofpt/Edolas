import assert from "node:assert/strict";
import test from "node:test";
import { logoutCurrentSession } from "../lib/auth/client.ts";

test("logout posts to the current-session endpoint and refreshes the current page", async () => {
  let refreshCount = 0;
  let requestMethod = "";
  let requestUrl = "";

  await logoutCurrentSession({
    request: async (input, init) => {
      requestUrl = input;
      requestMethod = String(init?.method);
      return { ok: true };
    },
    refresh: () => {
      refreshCount += 1;
    }
  });

  assert.equal(requestUrl, "/api/auth/logout");
  assert.equal(requestMethod, "POST");
  assert.equal(refreshCount, 1);
});

test("logout keeps the current page state when the request fails", async () => {
  let refreshCount = 0;

  await assert.rejects(
    logoutCurrentSession({
      request: async () => ({ ok: false }),
      refresh: () => {
        refreshCount += 1;
      }
    }),
    /Không thể đăng xuất/
  );

  assert.equal(refreshCount, 0);
});
