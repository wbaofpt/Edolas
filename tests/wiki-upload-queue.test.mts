import test from "node:test";
import assert from "node:assert/strict";
import { appendWikiUploadFiles, updateWikiUploadItem, type WikiUploadFileLike } from "../lib/wiki/upload-queue.ts";
import { buildWikiMediaGroupToken } from "../lib/wiki/content.ts";

const file = (name: string, size: number, type: string, lastModified = 1): WikiUploadFileLike => ({ name, size, type, lastModified });

test("wiki upload queue appends multiple selections and ignores exact duplicates", () => {
  const first = appendWikiUploadFiles([], [file("spawn.png", 100, "image/png"), file("tour.mp4", 200, "video/mp4")], () => "id");
  const second = appendWikiUploadFiles(first, [file("spawn.png", 100, "image/png"), file("rules.gif", 150, "image/gif")], () => "next");
  assert.equal(first.length, 2);
  assert.deepEqual(second.map((item) => item.file.name), ["spawn.png", "tour.mp4", "rules.gif"]);
  assert.ok(second.every((item) => item.status === "queued" && item.progress === 0));
});

test("wiki upload queue updates only the requested row", () => {
  const queue = appendWikiUploadFiles([], [file("a.png", 100, "image/png"), file("b.gif", 100, "image/gif")], (() => { let id = 0; return () => String(++id); })());
  const updated = updateWikiUploadItem(queue, queue[1]!.id, { status: "uploading", progress: 45, caption: "Animation" });
  assert.equal(updated[0]?.status, "queued");
  assert.deepEqual({ status: updated[1]?.status, progress: updated[1]?.progress, caption: updated[1]?.caption }, { status: "uploading", progress: 45, caption: "Animation" });
});

test("wiki media group tokens preserve upload order and captions", () => {
  assert.equal(buildWikiMediaGroupToken([
    { kind: "image", path: "/uploads/wiki/a.webp", caption: "Ảnh A" },
    { kind: "gif", path: "/uploads/wiki/b.gif", caption: "GIF B" },
    { kind: "video", path: "/uploads/wiki/c.mp4", caption: "Video C" }
  ]), "[[image:/uploads/wiki/a.webp|Ảnh A]]\n\n[[gif:/uploads/wiki/b.gif|GIF B]]\n\n[[video:/uploads/wiki/c.mp4|Video C]]");
});
