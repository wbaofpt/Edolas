import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { getScrollIndicatorMetrics } from "../lib/scroll-indicator.ts";

test("scroll indicator maps document progress onto the custom track", () => {
  const metrics = getScrollIndicatorMetrics({
    scrollY: 1_000,
    scrollHeight: 3_000,
    viewportHeight: 1_000,
    trackHeight: 800
  });

  assert.equal(metrics.scrollable, true);
  assert.equal(Math.round(metrics.thumbHeight), 267);
  assert.equal(Math.round(metrics.thumbOffset), 267);
});

test("scroll indicator stays hidden when the document does not scroll", () => {
  assert.deepEqual(getScrollIndicatorMetrics({
    scrollY: 0,
    scrollHeight: 800,
    viewportHeight: 800,
    trackHeight: 600
  }), {
    scrollable: false,
    thumbHeight: 600,
    thumbOffset: 0
  });
});

test("root layout mounts the transient custom scrollbar and hides native tracks", async () => {
  const [component, layout, styles] = await Promise.all([
    readFile(new URL("../components/custom-scrollbar.tsx", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  ]);

  assert.match(component, /is-visible/);
  assert.match(component, /requestAnimationFrame/);
  assert.match(component, /getBoundingClientRect\(\)\.height/);
  assert.doesNotMatch(component, /PointerEvent|setPointerCapture|onPointerMove|is-dragging/);
  assert.match(layout, /<CustomScrollbar \/>/);
  assert.match(styles, /scrollbar-width:\s*none/);
  assert.match(styles, /::-webkit-scrollbar/);
  assert.match(styles, /\.custom-scrollbar\.is-visible/);
  assert.doesNotMatch(styles, /is-scrollbar-dragging|\.custom-scrollbar\.is-dragging|cursor:\s*grab/);
});
