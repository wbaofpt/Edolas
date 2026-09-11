import test from "node:test";
import assert from "node:assert/strict";
import { insertWikiMediaAtSelection, parseWikiContent } from "../lib/wiki/content.ts";
import { validateWikiMedia } from "../lib/wiki/media.ts";

test("wiki media validation recognizes image, gif and video signatures", () => {
  assert.equal(validateWikiMedia(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), 8).ok, true);
  assert.deepEqual(validateWikiMedia(new Uint8Array([...new TextEncoder().encode("GIF89a"),1,0,1,0,0,0,0]), 13), { ok: true, kind: "gif", extension: "gif", mimeType: "image/gif" });
  assert.deepEqual(validateWikiMedia(new TextEncoder().encode("....ftypisom...."), 16), { ok: true, kind: "video", extension: "mp4", mimeType: "video/mp4" });
  assert.deepEqual(validateWikiMedia(new Uint8Array([0x1a,0x45,0xdf,0xa3,0x9f,0x42,0x86,0x81,0x01,0x42,0x82,0x84,0x77,0x65,0x62,0x6d]), 16), { ok: true, kind: "video", extension: "webm", mimeType: "video/webm" });
});

test("wiki media validation rejects truncated signature lookalikes", () => {
  assert.equal(validateWikiMedia(new Uint8Array([0x89,0x50,0x4e,0x47]), 4).ok, false);
  assert.equal(validateWikiMedia(new TextEncoder().encode("....ftypnope...."), 16).ok, false);
  assert.equal(validateWikiMedia(new Uint8Array([0x1a,0x45,0xdf,0xa3]), 4).ok, false);
});

test("wiki media validation enforces separate image and video limits", () => {
  assert.equal(validateWikiMedia(new TextEncoder().encode("GIF89a"), 10 * 1024 * 1024 + 1).ok, false);
  assert.equal(validateWikiMedia(new TextEncoder().encode("....ftypisom"), 50 * 1024 * 1024 + 1).ok, false);
  assert.equal(validateWikiMedia(new TextEncoder().encode("malware"), 7).ok, false);
});

test("media insertion uses the latest editor content instead of an upload-time snapshot", () => {
  assert.deepEqual(insertWikiMediaAtSelection("Text typed while uploading", 5, 5, "[[image:/uploads/wiki/a.webp|A]]"), {
    content: "Text \n\n[[image:/uploads/wiki/a.webp|A]]\n\ntyped while uploading",
    cursor: 41
  });
});

test("wiki content parser preserves text and accepts only controlled local media tokens", () => {
  const blocks = parseWikiContent("Mở đầu\n\n[[image:/uploads/wiki/guide.webp|Sơ đồ]]\n\n[[video:https://evil.example/x.mp4|X]]\n\nKết thúc");
  assert.deepEqual(blocks, [
    { type: "text", value: "Mở đầu" },
    { type: "image", path: "/uploads/wiki/guide.webp", caption: "Sơ đồ" },
    { type: "text", value: "[[video:https://evil.example/x.mp4|X]]" },
    { type: "text", value: "Kết thúc" }
  ]);
});
