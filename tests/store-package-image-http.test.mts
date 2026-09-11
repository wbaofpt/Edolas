import test from "node:test";
import assert from "node:assert/strict";
import { createStorePackageImageHandler } from "../lib/store/package-image-http.ts";

const session = { user: { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null }, expiresAt: new Date("2026-08-14T00:00:00Z") };
function request(method: "POST" | "DELETE", body?: FormData) {
  return new Request("https://edolas.vn/api/control/store/packages/4/image", { method, headers: { origin: "https://edolas.vn", host: "edolas.vn", cookie: "edolas_control_session=session; edolas_control_csrf=csrf", "x-control-csrf": "csrf" }, body });
}

test("store package image API requires a valid Control session", async () => {
  const handler = createStorePackageImageHandler({ resolveControlSession: async () => null });
  assert.equal((await handler(request("DELETE"), { params: { id: "4" } })).status, 401);
});

test("store package image API uploads and removes managed files", async () => {
  const updates: Array<string | null> = [];
  const removed: string[] = [];
  const handler = createStorePackageImageHandler({
    resolveControlSession: async () => session as never,
    writeImage: async () => ({ publicPath: "/uploads/store/packages/new.webp", diskPath: "D:/Edolas/public/uploads/store/packages/new.webp" }),
    updateStorePackageImage: async (_actor, _id, imagePath) => { updates.push(imagePath); return { ok: true, previousPath: imagePath ? "/uploads/store/packages/old.webp" : "/uploads/store/packages/new.webp", imagePath } as const; },
    removeFile: async (diskPath) => { removed.push(diskPath.replaceAll("\\", "/")); },
  });
  const form = new FormData();
  form.set("file", new File([new TextEncoder().encode("RIFF....WEBP")], "package.webp", { type: "image/webp" }));
  assert.equal((await handler(request("POST", form), { params: { id: "4" } })).status, 201);
  assert.equal((await handler(request("DELETE"), { params: { id: "4" } })).status, 200);
  assert.deepEqual(updates, ["/uploads/store/packages/new.webp", null]);
  assert.equal(removed.length, 2);
});

test("store package image API reports deferred cleanup instead of hiding it", async () => {
  const failures: string[] = [];
  const handler = createStorePackageImageHandler({
    resolveControlSession: async () => session as never,
    updateStorePackageImage: async () => ({ ok: true, previousPath: "/uploads/store/packages/old.webp", imagePath: null }) as const,
    removeFile: async () => { throw new Error("locked file"); },
    onCleanupFailure: (diskPath) => failures.push(diskPath),
  });
  const response = await handler(request("DELETE"), { params: { id: "4" } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).cleanupPending, true);
  assert.equal(failures.length, 1);
});
