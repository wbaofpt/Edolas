import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("homepage connection dock renders and refreshes privacy-safe network status", async () => {
  const [statusSource, dockSource, heroSource, pageSource, routeSource, cssSource] = await Promise.all([
    readFile(new URL("../components/minecraft-network-status.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/server-connection-dock.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/cinematic-hero.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/minecraft/status/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  ]);

  assert.match(statusSource, /\/api\/minecraft\/status/);
  assert.match(statusSource, /visibilitychange/);
  assert.match(statusSource, /ONLINE/);
  assert.match(statusSource, /OFFLINE/);
  assert.match(statusSource, /setStatus\(null\)/);
  assert.doesNotMatch(statusSource, /CONNECTING/);
  assert.doesNotMatch(statusSource, /status\.max/);
  assert.doesNotMatch(statusSource, /username|playerUuid|pluginHealth/);
  assert.match(dockSource, /MinecraftNetworkStatus/);
  assert.match(heroSource, /networkStatus/);
  assert.match(pageSource, /minecraftStatus/);
  assert.match(routeSource, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(routeSource, /stale-while-revalidate|max-age/);
  assert.doesNotMatch(cssSource, /\.connection-dock-online\s*\{\s*display:\s*none/);
});
