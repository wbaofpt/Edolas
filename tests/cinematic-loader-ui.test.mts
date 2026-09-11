import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loaderPath = new URL("../components/motion/cinematic-loader.tsx", import.meta.url);
const stylesPath = new URL("../app/globals.css", import.meta.url);

test("loader starts progress and decorative motion from one client-frame gate", async () => {
  const [loaderSource, styles] = await Promise.all([
    readFile(loaderPath, "utf8"),
    readFile(stylesPath, "utf8")
  ]);

  assert.match(loaderSource, /requestAnimationFrame/);
  assert.match(loaderSource, /data-motion=\{motionState\}/);
  assert.match(loaderSource, /motionStarted \? 1 : 0/);
  assert.match(styles, /\.cinematic-loader\[data-motion="running"\]/);
  assert.match(styles, /animation:[^;]+paused/);
  assert.match(styles, /animation-play-state:\s*running/);
});

test("loader hides document scrollbars before and after hydration", async () => {
  const [loaderSource, styles] = await Promise.all([
    readFile(loaderPath, "utf8"),
    readFile(stylesPath, "utf8")
  ]);

  assert.match(loaderSource, /document\.documentElement/);
  assert.match(styles, /html:has\(\.cinematic-loader\)/);
  assert.match(styles, /body:has\(\.cinematic-loader\)/);
});
