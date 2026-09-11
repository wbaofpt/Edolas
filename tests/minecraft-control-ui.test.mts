import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Control Minecraft organizes backend telemetry into accessible group disclosures", async () => {
  const [source, directory, dialog, head, css, nextConfig, middleware] = await Promise.all([
    readFile(new URL("../components/control/minecraft-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/control/minecraft-player-directory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/control/minecraft-group-delete-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/control/minecraft-player-head.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../next.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../middleware.ts", import.meta.url), "utf8")
  ]);

  assert.match(source, /status\?\.groups/);
  assert.match(source, /<details/);
  assert.match(source, /<summary/);
  assert.match(source, /activeServers/);
  assert.match(source, /totalServers/);
  assert.match(source, /group\.mapped/);
  assert.doesNotMatch(source, /network\.max/);
  assert.match(directory, /player\.group/);
  assert.match(source, /serverStatus/);
  assert.match(source, /UNKNOWN/);
  assert.match(source, /groups\.every/);
  assert.match(source, /healthyGroups/);
  assert.match(source, /offlineBackends/);
  assert.match(source, /controlFetch/);
  assert.match(source, /method:\s*"DELETE"/);
  assert.match(source, /pollGeneration/);
  assert.match(source, /removeMinecraftGroupFromStatus/);
  assert.match(source, /catch \{\s*if \(!cancelled && isCurrentMinecraftPoll/);
  assert.match(source, /group\.status === "offline"/);
  assert.match(source, /MinecraftGroupDeleteDialog/);
  assert.match(source, /minecraft-cluster-inventory-title" tabIndex=\{-1\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /cancelRef/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /event\.key (?:===|!==) "Tab"/);
  assert.match(dialog, /previousFocus/);
  assert.match(dialog, /aria-busy/);
  assert.match(dialog, /controls\.length === 0/);
  assert.match(directory, /MinecraftPlayerHead/);
  assert.match(source, /group\.servers\.length === 1/);
  assert.match(source, /formatMinecraftLocation/);
  assert.match(directory, /buildMinecraftPlayerFilterOptions/);
  assert.match(directory, /filterMinecraftPlayers/);
  assert.match(directory, /groupFilter/);
  assert.match(directory, /serverFilter/);
  assert.match(directory, /worldFilter/);
  assert.match(directory, /pingFilter/);
  assert.match(directory, /Xóa bộ lọc/);
  assert.match(directory, /Kết quả/);
  assert.match(directory, /minecraft-control-player/);
  assert.match(head, /player-skin/);
  assert.match(head, /minecraft-player-head-face/);
  assert.match(head, /minecraft-player-head-overlay/);
  assert.match(head, /username\.charAt/);
  assert.match(css, /\.minecraft-player-head/);
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(css, /\.minecraft-player-head-face/);
  assert.match(css, /\.minecraft-player-head-overlay/);
  assert.match(css, /\.minecraft-control-card-grid\.is-single/);
  assert.match(nextConfig, /textures\.minecraft\.net/);
  assert.match(middleware, /img-src 'self' data: blob: https:\/\/textures\.minecraft\.net/);
  assert.doesNotMatch(nextConfig, /mc-heads\.net/);
  assert.doesNotMatch(middleware, /mc-heads\.net/);
  assert.doesNotMatch(middleware, /img-src[^\n]*https:\/\/\*/);
  assert.match(css, /\.minecraft-control-group/);
  assert.match(css, /\.minecraft-control-group-summary:focus-visible/);
  assert.match(css, /\.minecraft-control-group-operations/);
  assert.match(css, /\.minecraft-delete-dialog/);
  assert.match(css, /#minecraft-cluster-inventory-title:focus/);

  for (const selector of [
    ".minecraft-control-network span",
    ".minecraft-control-network time",
    ".minecraft-control-section-heading p",
    ".minecraft-control-panel td small",
    ".minecraft-control-plugin-list span",
    ".minecraft-control-empty"
  ]) {
    const rule = css.match(new RegExp(`${selector.replaceAll(".", "\\.")} \\{[^}]+\\}`))?.[0] ?? "";
    assert.ok(rule, `missing CSS rule for ${selector}`);
    assert.doesNotMatch(rule, /#64748b/, `${selector} must retain readable contrast`);
  }
});
