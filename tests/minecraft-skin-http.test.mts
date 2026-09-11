import test from "node:test";
import assert from "node:assert/strict";
import { createMinecraftSkinHandler } from "../lib/minecraft/mojang-skin-http.ts";

const texture = `https://textures.minecraft.net/texture/${"a".repeat(64)}`;

test("Minecraft skin route requires an account-admin Control session", async () => {
  const anonymous = createMinecraftSkinHandler({ resolveSession: async () => null, resolveSkin: async () => texture });
  assert.equal((await anonymous(new Request("http://localhost/api/control/minecraft/player-skin/Bao_21"), { params: { username: "Bao_21" } })).status, 401);

  const staff = createMinecraftSkinHandler({ resolveSession: async () => ({ user: { roleName: "staff" } }) as never, resolveSkin: async () => texture });
  assert.equal((await staff(new Request("http://localhost/api/control/minecraft/player-skin/Bao_21"), { params: { username: "Bao_21" } })).status, 403);
});

test("Minecraft skin route redirects safe textures with a private five-minute cache", async () => {
  const handler = createMinecraftSkinHandler({
    resolveSession: async () => ({ user: { roleName: "admin" } }) as never,
    resolveSkin: async (username) => username === "Bao_21" ? texture : null
  });
  const response = await handler(new Request("http://localhost/api/control/minecraft/player-skin/Bao_21"), { params: { username: "Bao_21" } });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), texture);
  assert.equal(response.headers.get("cache-control"), "private, max-age=300, stale-while-revalidate=60");
});

test("Minecraft skin route returns a no-store 404 when Mojang has no usable skin", async () => {
  const handler = createMinecraftSkinHandler({
    resolveSession: async () => ({ user: { roleName: "owner" } }) as never,
    resolveSkin: async () => null
  });
  const response = await handler(new Request("http://localhost/api/control/minecraft/player-skin/Missing"), { params: { username: "Missing" } });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});
