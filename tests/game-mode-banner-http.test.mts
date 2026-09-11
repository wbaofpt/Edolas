import test from "node:test";
import assert from "node:assert/strict";
import { createGameModeBannerHandler } from "../lib/control/game-mode-banner-http.ts";

const admin = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };
const session = { user: admin, expiresAt: new Date("2026-08-13T00:00:00Z") };

function request(method: "POST" | "DELETE", body?: FormData) {
  return new Request("https://edolas.vn/api/control/website/game-mode/4/banner", {
    method,
    headers: {
      origin: "https://edolas.vn",
      host: "edolas.vn",
      cookie: "edolas_control_session=session; edolas_control_csrf=csrf",
      "x-control-csrf": "csrf"
    },
    body
  });
}

test("game mode banner API requires a valid Control mutation session", async () => {
  const handler = createGameModeBannerHandler({ resolveControlSession: async () => null });
  const response = await handler(request("DELETE"), { params: { id: "4" } });
  assert.equal(response.status, 401);
});

test("admin can upload and remove a game mode banner", async () => {
  const updates: Array<string | null> = [];
  const removed: string[] = [];
  const handler = createGameModeBannerHandler({
    resolveControlSession: async () => session as never,
    writeBanner: async () => ({ publicPath: "/uploads/game-modes/new.webp", diskPath: "D:/Edolas/public/uploads/game-modes/new.webp" }),
    updateGameModeBanner: async (_actor, _id, bannerPath) => {
      updates.push(bannerPath);
      return { ok: true, previousPath: bannerPath ? "/uploads/game-modes/old.webp" : "/uploads/game-modes/new.webp", bannerPath } as const;
    },
    removeFile: async (diskPath) => { removed.push(diskPath.replaceAll("\\", "/")); }
  });
  const form = new FormData();
  form.set("file", new File([new TextEncoder().encode("RIFF....WEBP")], "banner.webp", { type: "image/webp" }));

  const uploaded = await handler(request("POST", form), { params: { id: "4" } });
  assert.equal(uploaded.status, 201);
  assert.equal((await uploaded.json()).bannerPath, "/uploads/game-modes/new.webp");
  const deleted = await handler(request("DELETE"), { params: { id: "4" } });
  assert.equal(deleted.status, 200);
  assert.deepEqual(updates, ["/uploads/game-modes/new.webp", null]);
  assert.equal(removed.some((path) => path.endsWith("/uploads/game-modes/old.webp")), true);
  assert.equal(removed.some((path) => path.endsWith("/uploads/game-modes/new.webp")), true);
});
