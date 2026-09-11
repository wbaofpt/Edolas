import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("home CTA replaces guest authentication actions for signed-in members", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /getUserBySession/);
  assert.match(page, /SESSION_COOKIE_NAME/);
  assert.match(page, /user \?/);
  assert.match(page, /href="\/profile\/@me"/);
  assert.match(page, /Hồ sơ của tôi/);
  assert.match(page, /href="\/register"/);
});

test("Vietnamese connection and CTA labels avoid unsupported pixel fonts", async () => {
  const [dock, page, css] = await Promise.all([
    readFile(new URL("../components/server-connection-dock.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  ]);
  assert.match(dock, />Cổng kết nối</);
  assert.match(page, /home-cta-kicker/);
  assert.match(page, /home-cta-title/);
  assert.match(css, /\.connection-dock-kicker[\s\S]*var\(--font-inter\)/);
  assert.match(css, /\.home-cta-title/);
});
