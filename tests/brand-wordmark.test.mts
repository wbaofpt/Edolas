import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headerPath = new URL("../components/site-header.tsx", import.meta.url);
const loaderPath = new URL("../components/motion/cinematic-loader.tsx", import.meta.url);
const heroPath = new URL("../components/cinematic-hero.tsx", import.meta.url);
const wordmarkPath = new URL("../components/brand-wordmark.tsx", import.meta.url);
const stylesPath = new URL("../app/globals.css", import.meta.url);

async function readSource(path: URL) {
  return readFile(path, "utf8").catch(() => "");
}

test("header restores the block emblem while loader keeps the cinematic wordmark", async () => {
  const [headerSource, loaderSource, heroSource, wordmarkSource, stylesSource] = await Promise.all([
    readSource(headerPath),
    readSource(loaderPath),
    readSource(heroPath),
    readSource(wordmarkPath),
    readSource(stylesPath)
  ]);

  assert.match(headerSource, /<BrandWordmark variant="header" \/>/);
  assert.match(loaderSource, /<BrandWordmark variant="loader" \/>/);
  assert.match(heroSource, /<BrandWordmark variant="hero" \/>/);
  assert.doesNotMatch(headerSource, /\bSword\b/);
  assert.match(wordmarkSource, /MINECRAFT NETWORK/);
  assert.match(wordmarkSource, /brand-wordmark-season/);
  assert.match(wordmarkSource, /SEASON 03/);
  assert.match(wordmarkSource, /data-text="EDOLAS"/);
  assert.match(wordmarkSource, /data-text="SG"/);
  assert.match(wordmarkSource, /brand-wordmark-emblem/);
  assert.match(wordmarkSource, /brand-wordmark-header-copy/);
  assert.match(wordmarkSource, /brand-wordmark-header-network/);
  assert.match(wordmarkSource, /brand-wordmark-header-divider/);
  assert.doesNotMatch(wordmarkSource, /brand-wordmark-portal/);
  assert.doesNotMatch(stylesSource, /brand-wordmark-portal/);
});
