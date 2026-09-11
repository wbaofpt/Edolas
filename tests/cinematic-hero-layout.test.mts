import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { test } from "node:test";

const heroPath = new URL("../components/cinematic-hero.tsx", import.meta.url);
const stylesPath = new URL("../app/globals.css", import.meta.url);

test("home hero restores the shared cinematic wordmark composition", async () => {
  const [hero, styles] = await Promise.all([
    readFile(heroPath, "utf8"),
    readFile(stylesPath, "utf8")
  ]);

  assert.match(hero, /className="home-wordmark"/);
  assert.match(hero, /<BrandWordmark variant="hero" \/>/);
  assert.match(hero, /Khám phá thế giới/);
  assert.match(hero, /Tham gia Discord/);
  assert.match(hero, /play\.edolassg\.vn/);
  assert.doesNotMatch(hero, /realm-hero|realm-briefing|realm-connect|realm-portal|realm-mode/);

  assert.match(styles, /\.home-wordmark\s*\{/);
  assert.match(styles, /\.brand-wordmark--hero\s*\{/);
  assert.doesNotMatch(styles, /\.realm-hero|\.realm-briefing|\.realm-connect|\.realm-portal|\.realm-mode/);
});

test("home hero uses the generated Edolas night banner as its main artwork", async () => {
  const hero = await readFile(heroPath, "utf8");

  await access(new URL("../public/banner-edolas-night.png", import.meta.url));
  assert.match(hero, /src="\/banner-edolas-night\.png"/);
  assert.match(hero, /className="hero-banner-image/);
  assert.match(hero, /sizes="100vw"/);
  assert.doesNotMatch(hero, /src="\/edolassg-hero\.svg"/);
});
