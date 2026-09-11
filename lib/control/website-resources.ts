import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { getPool } from "../db.ts";

export const WEBSITE_RESOURCE_KINDS = ["announcement", "game-mode", "rule", "stat"] as const;
export type WebsiteResourceKind = typeof WEBSITE_RESOURCE_KINDS[number];
export type WebsiteResourceInput =
  | { title: string; body: string; publishedAt: string }
  | { slug: string; name: string; summary: string; status: string; tags: string[] }
  | { code: string; title: string; summary: string; severity: "Tối cao" | "Nặng" | "Nhắc nhở" }
  | { statKey: string; statValue: string; statDetail: string };
export type WebsiteResource = { id: number; kind: WebsiteResourceKind; values: Record<string, string>; deletedAt: Date | string | null; bannerPath?: string | null; tags?: string[] };

type ResourceDb = Pick<Pool, "query" | "getConnection">;
type MutationDb = Pick<Pool, "getConnection">;
type Connection = Pick<PoolConnection, "beginTransaction" | "execute" | "commit" | "rollback" | "release">;
type SqlValue = string | number | Date | null | boolean;
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const exactKeys = (input: Record<string, unknown>, keys: string[]) => Object.keys(input).every((key) => keys.includes(key));

function cleanTags(value: unknown) {
  if (!Array.isArray(value) || value.length > 8) return [];
  const tags: string[] = [];
  for (const item of value) {
    const tag = clean(item, 24);
    if (!tag || tags.some((current) => current.toLocaleLowerCase("vi") === tag.toLocaleLowerCase("vi"))) continue;
    tags.push(tag);
  }
  return tags;
}

function readTags(value: unknown, name: string) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const tags = cleanTags(parsed);
    return tags.length ? tags : ["PE/PC", name];
  } catch {
    return ["PE/PC", name];
  }
}

export function parseWebsiteResource(kind: unknown, input: unknown): { ok: true; value: WebsiteResourceInput } | { ok: false; error: string } {
  if (!WEBSITE_RESOURCE_KINDS.includes(kind as WebsiteResourceKind) || !input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Loại dữ liệu website không hợp lệ." };
  const value = input as Record<string, unknown>;
  if (kind === "announcement" && exactKeys(value, ["title", "body", "publishedAt"])) {
    const result = { title: clean(value.title, 200), body: clean(value.body, 5000), publishedAt: clean(value.publishedAt, 10) };
    if (result.title.length >= 3 && result.body.length >= 8 && /^\d{4}-\d{2}-\d{2}$/.test(result.publishedAt)) return { ok: true, value: result };
  }
  if (kind === "game-mode" && exactKeys(value, ["slug", "name", "summary", "status", "tags"])) {
    const result = { slug: clean(value.slug, 50).toLowerCase(), name: clean(value.name, 80), summary: clean(value.summary, 2000), status: clean(value.status, 20), tags: cleanTags(value.tags) };
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug) && result.name.length >= 3 && result.summary.length >= 8 && result.status && result.tags.length) return { ok: true, value: result };
  }
  if (kind === "rule" && exactKeys(value, ["code", "title", "summary", "severity"])) {
    const severity = clean(value.severity, 20);
    const result = { code: clean(value.code, 20).toUpperCase(), title: clean(value.title, 160), summary: clean(value.summary, 3000), severity };
    if (result.code.length >= 3 && result.title.length >= 3 && result.summary.length >= 8 && ["Tối cao", "Nặng", "Nhắc nhở"].includes(severity)) return { ok: true, value: result as WebsiteResourceInput };
  }
  if (kind === "stat" && exactKeys(value, ["statKey", "statValue", "statDetail"])) {
    const result = { statKey: clean(value.statKey, 60).toLowerCase(), statValue: clean(value.statValue, 80), statDetail: clean(value.statDetail, 160) };
    if (/^[a-z0-9_]+$/.test(result.statKey) && result.statValue && result.statDetail.length >= 3) return { ok: true, value: result };
  }
  return { ok: false, error: "Dữ liệu website không hợp lệ hoặc chứa trường không được phép." };
}

export async function listWebsiteResources(db: ResourceDb = getPool()): Promise<WebsiteResource[]> {
  const [announcements, modes, rules, stats] = await Promise.all([
    db.query("SELECT id,title,body,published_at,deleted_at FROM announcements ORDER BY published_at DESC"),
    db.query("SELECT id,slug,name,summary,status,banner_path,tags_json,deleted_at FROM game_modes ORDER BY id"),
    db.query("SELECT id,code,title,summary,severity,deleted_at FROM rules ORDER BY code"),
    db.query("SELECT id,stat_key,stat_value,stat_detail,deleted_at FROM server_stats ORDER BY id")
  ]) as Array<[Array<Record<string, unknown>>, unknown]>;
  return [
    ...announcements[0].map((row) => ({ id: Number(row.id), kind: "announcement" as const, values: { title: String(row.title), body: String(row.body), publishedAt: new Date(row.published_at as Date | string).toISOString().slice(0, 10) }, deletedAt: row.deleted_at as Date | string | null })),
    ...modes[0].map((row) => ({ id: Number(row.id), kind: "game-mode" as const, values: { slug: String(row.slug), name: String(row.name), summary: String(row.summary), status: String(row.status) }, deletedAt: row.deleted_at as Date | string | null, bannerPath: row.banner_path ? String(row.banner_path) : null, tags: readTags(row.tags_json, String(row.name)) })),
    ...rules[0].map((row) => ({ id: Number(row.id), kind: "rule" as const, values: { code: String(row.code), title: String(row.title), summary: String(row.summary), severity: String(row.severity) }, deletedAt: row.deleted_at as Date | string | null })),
    ...stats[0].map((row) => ({ id: Number(row.id), kind: "stat" as const, values: { statKey: String(row.stat_key), statValue: String(row.stat_value), statDetail: String(row.stat_detail) }, deletedAt: row.deleted_at as Date | string | null }))
  ];
}

async function transaction<T>(db: MutationDb, work: (connection: Connection) => Promise<T>) {
  const connection = await db.getConnection() as Connection;
  await connection.beginTransaction();
  try { const result = await work(connection); if (result && typeof result === "object" && "ok" in result && result.ok === false) await connection.rollback(); else await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

function writeSql(kind: WebsiteResourceKind, id: number | null, value: WebsiteResourceInput): [string, SqlValue[]] {
  if (kind === "announcement") { const item = value as Extract<WebsiteResourceInput, { title: string; body: string }>; return id ? ["UPDATE announcements SET title=?,body=?,published_at=? WHERE id=?", [item.title, item.body, item.publishedAt, id]] : ["INSERT INTO announcements (title,body,published_at) VALUES (?,?,?)", [item.title, item.body, item.publishedAt]]; }
  if (kind === "game-mode") { const item = value as Extract<WebsiteResourceInput, { slug: string }>; const tags = JSON.stringify(item.tags); return id ? ["UPDATE game_modes SET slug=?,name=?,summary=?,status=?,tags_json=? WHERE id=?", [item.slug, item.name, item.summary, item.status, tags, id]] : ["INSERT INTO game_modes (slug,name,summary,status,tags_json) VALUES (?,?,?,?,?)", [item.slug, item.name, item.summary, item.status, tags]]; }
  if (kind === "rule") { const item = value as Extract<WebsiteResourceInput, { code: string }>; return id ? ["UPDATE rules SET code=?,title=?,summary=?,severity=? WHERE id=?", [item.code, item.title, item.summary, item.severity, id]] : ["INSERT INTO rules (code,title,summary,severity) VALUES (?,?,?,?)", [item.code, item.title, item.summary, item.severity]]; }
  const item = value as Extract<WebsiteResourceInput, { statKey: string }>;
  return id ? ["UPDATE server_stats SET stat_key=?,stat_value=?,stat_detail=? WHERE id=?", [item.statKey, item.statValue, item.statDetail, id]] : ["INSERT INTO server_stats (stat_key,stat_value,stat_detail) VALUES (?,?,?)", [item.statKey, item.statValue, item.statDetail]];
}

export async function saveWebsiteResource(actor: PublicUser, kind: WebsiteResourceKind, id: number | null, input: unknown, db: MutationDb = getPool()) {
  const parsed = parseWebsiteResource(kind, input);
  if (!parsed.ok) return { ok: false as const, status: 400 as const, error: parsed.error };
  return transaction(db, async (connection) => {
    const [sql, values] = writeSql(kind, id, parsed.value);
    const [result] = await connection.execute(sql, values);
    const resourceId = id ?? Number((result as { insertId?: number }).insertId ?? 0);
    await connection.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary,metadata) VALUES (?,?,?,?,?,?)", [actor.id, id ? "website.update" : "website.create", kind, String(resourceId), `${id ? "Cập nhật" : "Tạo"} ${kind} #${resourceId}`, JSON.stringify(parsed.value)]);
    return { ok: true as const, id: resourceId };
  });
}

export async function setWebsiteResourceTrash(actor: PublicUser, kind: WebsiteResourceKind, id: number, trash: boolean, db: MutationDb = getPool()) {
  if (!WEBSITE_RESOURCE_KINDS.includes(kind)) return { ok: false as const, status: 400 as const, error: "Loại dữ liệu website không hợp lệ." };
  return transaction(db, async (connection) => {
    const tables: Record<WebsiteResourceKind, string> = { announcement: "announcements", "game-mode": "game_modes", rule: "rules", stat: "server_stats" };
    const table = tables[kind];
    await connection.execute(`UPDATE ${table} SET deleted_at=?,deleted_by=?,purge_after=? WHERE id=?`, [trash ? new Date() : null, trash ? actor.id : null, trash ? new Date(Date.now() + 30 * 86400000) : null, id]);
    await connection.execute("INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id,summary) VALUES (?,?,?,?,?)", [actor.id, trash ? "website.trash" : "website.restore", kind, String(id), `${trash ? "Xóa" : "Khôi phục"} ${kind} #${id}`]);
    return { ok: true as const };
  });
}
