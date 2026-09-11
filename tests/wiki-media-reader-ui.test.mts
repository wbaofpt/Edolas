import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("wiki editor uploads supported media and inserts it at the text cursor", async () => {
  const [editor, uploader] = await Promise.all([
    read("../components/wiki/wiki-article-editor.tsx"),
    read("../components/wiki/wiki-media-uploader.tsx")
  ]);
  assert.match(uploader, /\/api\/control\/wiki\/media/);
  assert.match(uploader, /x-control-csrf/);
  assert.match(uploader, /image\/gif/);
  assert.match(uploader, /video\/mp4/);
  assert.match(uploader, /multiple/);
  assert.match(uploader, /wiki-upload-queue-list/);
  assert.match(uploader, /Thử lại/);
  assert.match(uploader, /aria-live/);
  assert.match(editor, /selectionStart/);
  assert.match(editor, /buildWikiMediaGroupToken/);
  assert.match(editor, /WikiMediaUploader/);
});

test("wiki content renderer uses native lazy images and controlled videos", async () => {
  const renderer = await read("../components/wiki/wiki-content-renderer.tsx");
  assert.match(renderer, /parseWikiContent/);
  assert.match(renderer, /loading="lazy"/);
  assert.match(renderer, /<video/);
  assert.match(renderer, /controls/);
  assert.match(renderer, /preload="metadata"/);
});

test("public wiki page renders rich content and live reader status", async () => {
  const [page, tracker] = await Promise.all([
    read("../app/wiki/[slug]/page.tsx"),
    read("../components/wiki/wiki-reader-tracker.tsx")
  ]);
  assert.match(page, /WikiContentRenderer/);
  assert.match(page, /WikiReaderTracker/);
  assert.match(page, /getWikiReaderMetrics/);
  assert.match(tracker, /event:\s*"open"/);
  assert.match(tracker, /send\("heartbeat"\)/);
  assert.match(tracker, /30_000/);
  assert.match(tracker, /visibilityState/);
});
