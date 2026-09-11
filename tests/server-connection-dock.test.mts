import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("hero connection dock presents separate Java and Bedrock endpoints", async () => {
  const [dock, hero, page, css] = await Promise.all([
    readFile(new URL("../components/server-connection-dock.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/cinematic-hero.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  ]);
  assert.match(dock, /PC \/ JAVA/);
  assert.match(dock, /PE \/ BEDROCK/);
  assert.match(dock, /bedrockPort/);
  assert.match(dock, /navigator\.clipboard/);
  assert.match(dock, /aria-live="polite"/);
  assert.match(hero, /ServerConnectionDock/);
  assert.match(page, /bedrockIp=\{siteConfig\.bedrockIp\}/);
  assert.match(page, /bedrockPort=\{siteConfig\.bedrockPort\}/);
  assert.match(css, /\.server-connection-dock/);
  assert.match(css, /\.connection-channel\.is-bedrock/);
});
