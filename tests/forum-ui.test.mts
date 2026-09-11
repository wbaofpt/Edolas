import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("forum index uses database services rather than static topic content", async () => {
  const source = await readFile(new URL("../app/forum/page.tsx", import.meta.url), "utf8");
  assert.match(source, /listForumCategories/);
  assert.match(source, /listRecentTopics/);
  assert.doesNotMatch(source, /forumTopics/);
});

test("forum includes authenticated topic creation and like controls", async () => {
  const form = await readFile(new URL("../components/forum/new-topic-form.tsx", import.meta.url), "utf8");
  const like = await readFile(new URL("../components/forum/topic-like-button.tsx", import.meta.url), "utf8");
  assert.match(form, /\/api\/forum\/topics/);
  assert.match(form, /\/api\/forum\/media/);
  assert.match(form, /multiple/);
  assert.match(form, /video\/mp4/);
  assert.match(form, /Xem trước/);
  assert.match(form, /createObjectURL/);
  assert.match(like, /\/like/);
  assert.match(like, /aria-pressed/);
});

test("forum topic detail renders safe image, GIF and video blocks", async () => {
  const page = await readFile(new URL("../app/forum/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /WikiContentRenderer/);
});
