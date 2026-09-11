import test from "node:test";
import assert from "node:assert/strict";
import { readPublicWebsiteContent } from "../lib/public-website-content.ts";

test("public website content maps database rows into existing UI shapes", async () => {
  const db = { query: async (sql: string) => {
    if (sql.includes("announcements")) return [[{ title: "Tin DB", body: "Nội dung", published_at: new Date("2026-08-12T00:00:00Z") }], undefined] as const;
    if (sql.includes("game_modes")) return [[{ slug: "hardcore", name: "Hardcore", summary: "Thử thách", status: "Đang mở", banner_path: "/uploads/game-modes/hardcore.webp", tags_json: ["PE/PC", "Survival"] }], undefined] as const;
    if (sql.includes("rules")) return [[{ code: "EDO-99", title: "Luật DB", summary: "Mô tả", severity: "Nặng" }], undefined] as const;
    return [[{ stat_key: "online_today", stat_value: "128", stat_detail: "Đang trực tuyến" }], undefined] as const;
  } };
  const content = await readPublicWebsiteContent(db as never);
  assert.equal(content.announcements[0]?.title, "Tin DB");
  assert.equal(content.gameModes[0]?.name, "Hardcore");
  assert.equal(content.gameModes[0]?.slug, "hardcore");
  assert.equal(content.gameModes[0]?.bannerPath, "/uploads/game-modes/hardcore.webp");
  assert.deepEqual(content.gameModes[0]?.features, ["PE/PC", "Survival"]);
  assert.deepEqual(content.gameModes[0]?.telemetry, { status: "offline", online: 0 });
  assert.equal(content.rules[0]?.code, "EDO-99");
  assert.equal(content.heroStats[0]?.value, "0");
});

test("public website content falls back to bundled content when database fails", async () => {
  const content = await readPublicWebsiteContent({ query: async () => { throw new Error("offline"); } } as never);
  assert.ok(content.announcements.length > 0);
  assert.ok(content.gameModes.length > 0);
  assert.ok(content.rules.length > 0);
  assert.ok(content.heroStats.length > 0);
  assert.equal(content.heroStats[0]?.value, "0");
});

test("public website content overlays the static online stat in memory", async () => {
  const db = { query: async (sql: string) => {
    if (sql.includes("minecraft_servers")) return [[
      { server_id: "survival-01", group_key: "survival", online_players: 12, last_seen_at: new Date("2026-08-13T12:00:00Z") },
      { server_id: "survival-02", group_key: "survival", online_players: 8, last_seen_at: new Date("2026-08-13T12:00:05Z") }
    ], undefined] as const;
    if (sql.includes("announcements")) return [[{ title: "Tin DB", body: "Noi dung", published_at: new Date("2026-08-13T00:00:00Z") }], undefined] as const;
    if (sql.includes("game_modes")) return [[
      { slug: "survival", name: "Survival", summary: "Sinh ton", status: "open", banner_path: null, tags_json: [] },
      { slug: "creative", name: "Creative", summary: "Xay dung", status: "open", banner_path: null, tags_json: [] }
    ], undefined] as const;
    if (sql.includes("rules")) return [[{ code: "EDO-01", title: "Luat", summary: "Mo ta", severity: "Náº·ng" }], undefined] as const;
    return [[{ stat_key: "online_today", stat_value: "1,248", stat_detail: "Du lieu tinh" }], undefined] as const;
  } };

  const content = await readPublicWebsiteContent(db as never, new Date("2026-08-13T12:00:10Z"));
  assert.equal(content.heroStats[0]?.value, "20");
  assert.doesNotMatch(content.heroStats[0]?.detail ?? "", /slot|\//i);
  assert.deepEqual(content.gameModes[0]?.telemetry, { status: "online", online: 20 });
  assert.deepEqual(content.gameModes[1]?.telemetry, { status: "offline", online: 0 });
});

test("public stats use live forum and published Wiki counts", async () => {
  const db = { query: async (sql: string) => {
    if (sql.includes("minecraft_servers")) return [[], undefined] as const;
    if (sql.includes("announcements")) return [[], undefined] as const;
    if (sql.includes("game_modes")) return [[], undefined] as const;
    if (sql.includes("rules")) return [[], undefined] as const;
    return [[
      { stat_key: "topics_open", stat_value: "486", stat_detail: "Trao doi", live_topics: 7, live_wiki_pages: 3 },
      { stat_key: "wiki_pages", stat_value: "214", stat_detail: "Huong dan", live_topics: 7, live_wiki_pages: 3 },
      { stat_key: "response_rate", stat_value: "98%", stat_detail: "Noi bo", live_topics: 7, live_wiki_pages: 3 }
    ], undefined] as const;
  } };

  const content = await readPublicWebsiteContent(db as never);
  assert.equal(content.heroStats[0]?.value, "7");
  assert.equal(content.heroStats[1]?.value, "3");
  assert.equal(content.heroStats[2]?.value, "98%");
});
