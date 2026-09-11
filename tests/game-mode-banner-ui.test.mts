import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Control website manager provides accessible game mode banner controls", async () => {
  const manager = await readFile(new URL("../components/control/website-resource-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /Ảnh banner/);
  assert.match(manager, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(manager, /api\/control\/website\/game-mode\/\$\{editing\.id\}\/banner/);
  assert.match(manager, /Gỡ banner/);
  assert.match(manager, /Thêm tag/);
  assert.match(manager, /Xóa tag/);
});

test("public game mode cards render an optional managed banner behind readable content", async () => {
  const [card, grid, home, catalog, css] = await Promise.all([
    readFile(new URL("../components/game-mode-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/game-mode-grid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game-modes/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  ]);
  assert.match(card, /mode\.bannerPath/);
  assert.match(card, /mode-card-visual/);
  assert.doesNotMatch(card, /mode\.players/);
  assert.match(card, /mode-card-overlay/);
  assert.match(card, /mode-card-status/);
  assert.match(card, /mode\.telemetry\.online/);
  assert.match(card, /mode\.telemetry\.status/);
  assert.match(card, /mode-card-banner/);
  assert.match(card, /alt=""/);
  assert.match(css, /\.mode-card-shade/);
  assert.match(css, /\.mode-card-status/);
  assert.match(css, /filter: saturate\(1\.04\) contrast\(1\.03\)/);
  assert.match(css, /\.mode-card:hover \.mode-card-banner/);
  assert.match(grid, /\/api\/minecraft\/status/);
  assert.match(grid, /10_000/);
  assert.match(grid, /visibilitychange/);
  assert.match(grid, /mergeGameModeTelemetry/);
  assert.match(home, /GameModeGrid/);
  assert.match(catalog, /GameModeGrid/);
});
