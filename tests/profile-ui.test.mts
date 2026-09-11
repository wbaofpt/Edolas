import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("profile page renders database stats and owner activity", async () => {
  const page = await readFile(new URL("../app/profile/[username]/page.tsx", import.meta.url), "utf8");
  const hero = await readFile(new URL("../components/profile/profile-hero.tsx", import.meta.url), "utf8");
  assert.match(page, /getProfileByUsername/);
  assert.match(page, /listProfileTopics/);
  assert.match(page, /listProfileConnections/);
  assert.match(hero, /profile\.stats/);
  assert.match(page, /likedTopics/);
  assert.match(page, /listOwnLikedTopics\(profile\.id, viewer\?\.id\)/);
});

test("profile connection lists link followers and following to public profiles", async () => {
  const connections = await readFile(new URL("../components/profile/profile-connections.tsx", import.meta.url), "utf8");
  assert.match(connections, /Người theo dõi/);
  assert.match(connections, /Đang theo dõi/);
  assert.match(connections, /`\/profile\/\${member\.username}`/);
});

test("profile actions expose local avatar upload and follow behavior", async () => {
  const actions = await readFile(new URL("../components/profile/profile-actions.tsx", import.meta.url), "utf8");
  assert.match(actions, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(actions, /\/api\/profile\/avatar/);
  assert.match(actions, /\/follow/);
  assert.match(actions, /aria-live="polite"/);
});

test("account dropdown links the signed-in user to their profile", async () => {
  const menu = await readFile(new URL("../components/account-menu.tsx", import.meta.url), "utf8");
  assert.match(menu, /href="\/profile\/@me"/);
  assert.match(menu, /Hồ sơ của tôi/);
  assert.match(menu, /profileLinkRef/);
});

test("profile me alias resolves the signed-in account without changing the public profile route", async () => {
  const page = await readFile(new URL("../app/profile/[username]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /resolveProfileRoute\(params\.username, viewer\?\.username/);
  assert.match(page, /redirect\("\/login\?next=\/profile\/%40me"\)/);
});

test("profile uses the split command layout and supported Vietnamese typography", async () => {
  const [page, hero, activity, css] = await Promise.all([
    readFile(new URL("../app/profile/[username]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/profile/profile-hero.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/profile/profile-activity.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  ]);
  assert.match(page, /profile-split-layout/);
  assert.match(page, /profile-identity-rail/);
  assert.match(page, /profile-main-column/);
  assert.match(page, /<ProfileStats profile=\{profile\}/);
  assert.doesNotMatch(page, /className="profile-dossier-layout"/);
  assert.match(page, /StaggerGroup/);
  assert.match(hero, /profile-display-name/);
  assert.match(hero, /export function ProfileStats/);
  assert.doesNotMatch(hero, /font-pixel[^\n]*\{profile\.displayName\}/);
  assert.match(activity, /profile-section-title/);
  assert.match(css, /\.profile-split-layout/);
  assert.match(css, /\.profile-identity-rail/);
  assert.match(css, /\.profile-editor-panel/);
});
