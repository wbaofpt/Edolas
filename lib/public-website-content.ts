import type { Pool } from "mysql2/promise";
import { announcements as fallbackAnnouncements, gameModes as fallbackGameModes, heroStats as fallbackStats, rules as fallbackRules } from "./content.ts";
import { getPool } from "./db.ts";
import type { Announcement, GameMode, RuleItem, ServerStat } from "./types.ts";
import { readPublicMinecraftStatus } from "./minecraft/public-status.ts";

const accents = ["from-[#8B5CF6] to-[#38BDF8]", "from-[#38BDF8] to-[#67E8F9]", "from-[#8B5CF6] to-[#67E8F9]", "from-[#67E8F9] to-[#E0F2FE]"];
const statLabels: Record<string, string> = { online_today: "Người chơi online", topics_open: "Chủ đề diễn đàn", wiki_pages: "Trang Wiki", response_rate: "Tỷ lệ phản hồi" };

function withOfflinePlayerCount(stats: ServerStat[]) {
  return stats.map((stat) => stat.label.toLowerCase().includes("online")
    ? { ...stat, value: "0", detail: "Chưa nhận được tín hiệu từ network" }
    : stat);
}

function modeTags(value: unknown, name: string) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return ["PE/PC", name];
    const tags = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 8);
    return tags.length ? tags : ["PE/PC", name];
  } catch {
    return ["PE/PC", name];
  }
}

export async function readPublicWebsiteContent(db: Pick<Pool, "query"> = getPool(), now = new Date()): Promise<{ announcements: Announcement[]; gameModes: GameMode[]; rules: RuleItem[]; heroStats: ServerStat[]; minecraftStatus: Awaited<ReturnType<typeof readPublicMinecraftStatus>> }> {
  try {
    const contentQueries = Promise.all([
      db.query("SELECT title,body,published_at FROM announcements WHERE deleted_at IS NULL ORDER BY published_at DESC LIMIT 8"),
      db.query("SELECT slug,name,summary,status,banner_path,tags_json FROM game_modes WHERE deleted_at IS NULL ORDER BY id LIMIT 12"),
      db.query("SELECT code,title,summary,severity FROM rules WHERE deleted_at IS NULL ORDER BY code LIMIT 30"),
      db.query(`SELECT stat_key,stat_value,stat_detail,
        (SELECT COUNT(*) FROM forum_topics WHERE deleted_at IS NULL) AS live_topics,
        (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL AND is_published = TRUE) AS live_wiki_pages
        FROM server_stats WHERE deleted_at IS NULL ORDER BY id LIMIT 12`)
    ]) as Promise<Array<[Array<Record<string, unknown>>, unknown]>>;
    const [[announcementResult, modeResult, ruleResult, statResult], minecraftStatus] = await Promise.all([
      contentQueries,
      readPublicMinecraftStatus(db, now)
    ]);
    const announcements = announcementResult[0].map((row) => ({ title: String(row.title), body: String(row.body), date: new Intl.DateTimeFormat("vi-VN").format(new Date(row.published_at as Date | string)) }));
    const groups = new Map(minecraftStatus?.groups.map((group) => [group.key, group]) ?? []);
    const gameModes = modeResult[0].map((row, index) => {
      const group = groups.get(String(row.slug));
      return {
        slug: String(row.slug),
        name: String(row.name),
        summary: String(row.summary),
        players: String(row.status),
        accent: accents[index % accents.length],
        features: modeTags(row.tags_json, String(row.name)),
        bannerPath: row.banner_path ? String(row.banner_path) : null,
        telemetry: { status: group?.status ?? "offline", online: group?.online ?? 0 }
      };
    });
    const rules = ruleResult[0].map((row) => ({ code: String(row.code), title: String(row.title), summary: String(row.summary), severity: String(row.severity) as RuleItem["severity"] }));
    const liveStats = statResult[0][0] ?? {};
    const liveTopics = Number(liveStats.live_topics);
    const liveWikiPages = Number(liveStats.live_wiki_pages);
    const heroStats = statResult[0].map((row) => {
      const key = String(row.stat_key);
      if (key === "online_today") {
        return {
          label: statLabels[key],
          value: String(minecraftStatus?.online ?? 0),
          detail: minecraftStatus ? "Đang hoạt động trên toàn network" : "Chưa nhận được tín hiệu từ network"
        };
      }
      if (key === "topics_open" && Number.isFinite(liveTopics)) {
        return { label: statLabels[key], value: String(liveTopics), detail: String(row.stat_detail) };
      }
      if (key === "wiki_pages" && Number.isFinite(liveWikiPages)) {
        return { label: statLabels[key], value: String(liveWikiPages), detail: String(row.stat_detail) };
      }
      return { label: statLabels[key] ?? key.replaceAll("_", " "), value: String(row.stat_value), detail: String(row.stat_detail) };
    });
    return { announcements: announcements.length ? announcements : fallbackAnnouncements, gameModes: gameModes.length ? gameModes : fallbackGameModes, rules: rules.length ? rules : fallbackRules, heroStats: heroStats.length ? heroStats : withOfflinePlayerCount(fallbackStats), minecraftStatus };
  } catch {
    return { announcements: fallbackAnnouncements, gameModes: fallbackGameModes, rules: fallbackRules, heroStats: withOfflinePlayerCount(fallbackStats), minecraftStatus: null };
  }
}
