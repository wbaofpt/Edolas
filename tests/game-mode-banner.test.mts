import test from "node:test";
import assert from "node:assert/strict";
import { validateGameModeBanner } from "../lib/control/game-mode-banner.ts";

test("game mode banners accept only valid JPG, PNG and WebP signatures", () => {
  assert.deepEqual(
    validateGameModeBanner(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 4),
    { ok: true, extension: "jpg", mimeType: "image/jpeg" }
  );
  assert.deepEqual(
    validateGameModeBanner(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 8),
    { ok: true, extension: "png", mimeType: "image/png" }
  );
  assert.deepEqual(
    validateGameModeBanner(new TextEncoder().encode("RIFF....WEBP"), 12),
    { ok: true, extension: "webp", mimeType: "image/webp" }
  );
  assert.equal(validateGameModeBanner(new TextEncoder().encode("<svg></svg>"), 11).ok, false);
});

test("game mode banners reject files over eight megabytes", () => {
  const result = validateGameModeBanner(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 8 * 1024 * 1024 + 1);
  assert.deepEqual(result, { ok: false, error: "Ảnh banner không được vượt quá 8 MB." });
});
