import test from "node:test";
import assert from "node:assert/strict";
import { resolveMojangSkinUrl } from "../lib/minecraft/mojang-skin.ts";

function profileTexture(url: string) {
  return Buffer.from(JSON.stringify({ textures: { SKIN: { url } } }), "utf8").toString("base64");
}

test("Mojang skin lookup resolves the current texture by username", async () => {
  const hash = "a".repeat(64);
  const calls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("api.mojang.com")) {
      return Response.json({ id: "e025b2a8abde3540a0f2dae3d0c272e8", name: "QuocBaooo" });
    }
    return Response.json({ properties: [{ name: "textures", value: profileTexture(`http://textures.minecraft.net/texture/${hash}`) }] });
  };

  assert.equal(await resolveMojangSkinUrl("QuocBaooo", fetcher as typeof fetch), `https://textures.minecraft.net/texture/${hash}`);
  assert.deepEqual(calls, [
    "https://api.mojang.com/users/profiles/minecraft/QuocBaooo",
    "https://sessionserver.mojang.com/session/minecraft/profile/e025b2a8abde3540a0f2dae3d0c272e8"
  ]);
});

test("Mojang skin lookup rejects invalid names and unsafe texture responses", async () => {
  let calls = 0;
  const unused = async () => { calls += 1; return new Response(); };
  assert.equal(await resolveMojangSkinUrl("../../player", unused as typeof fetch), null);
  assert.equal(calls, 0);

  const responses = [
    Response.json({ id: "e025b2a8abde3540a0f2dae3d0c272e8", name: "Bao_21" }),
    Response.json({ properties: [{ name: "textures", value: profileTexture(`https://evil.example/texture/${"b".repeat(64)}`) }] })
  ];
  assert.equal(await resolveMojangSkinUrl("Bao_21", (async () => responses.shift()!) as typeof fetch), null);
});

test("Mojang skin lookup fails closed for missing and malformed profiles", async () => {
  assert.equal(await resolveMojangSkinUrl("Missing", (async () => new Response(null, { status: 404 })) as typeof fetch), null);
  const responses = [
    Response.json({ id: "e025b2a8abde3540a0f2dae3d0c272e8", name: "Bao_21" }),
    Response.json({ properties: [{ name: "textures", value: "not-base64-json" }] })
  ];
  assert.equal(await resolveMojangSkinUrl("Bao_21", (async () => responses.shift()!) as typeof fetch), null);
});
