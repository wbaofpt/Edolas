import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";
import type { WikiClusterInput, WikiPageInput } from "./validation.ts";
import { extractWikiMediaPaths } from "./content.ts";

export type WikiDb = Pick<Pool, "query" | "execute">;
export type WikiCluster = { id: number; slug: string; name: string; description: string; accent: string; sortOrder: number; pages: number };
export type WikiPageSummary = { id: number; slug: string; title: string; summary: string; clusterSlug: string; clusterName: string; updatedAt: Date | string; isPublished?: boolean; sortOrder?: number; clusterId?: number };
export type WikiPageDetail = WikiPageSummary & { body: string };
export type WikiAdminPage = WikiPageSummary & { body?: string };
export type WikiAdminPageDetail = WikiAdminPage & { body: string };
export type WikiAdminFilters = { query?: string; clusterId?: number; status?: "all" | "published" | "draft" };
const num = (value: unknown) => Number(value) || 0;

export async function listWikiClusters(db: WikiDb = getPool()): Promise<WikiCluster[]> {
  const [rows] = await db.query(`SELECT wc.id, wc.slug, wc.name, wc.description, wc.accent, wc.sort_order, COUNT(wp.id) AS pages FROM wiki_clusters wc LEFT JOIN wiki_pages wp ON wp.cluster_id = wc.id AND wp.is_published = TRUE GROUP BY wc.id, wc.slug, wc.name, wc.description, wc.accent, wc.sort_order ORDER BY wc.sort_order, wc.name`) as [Array<Record<string, unknown>>, unknown];
  return rows.map((r) => ({ id: num(r.id), slug: String(r.slug), name: String(r.name), description: String(r.description), accent: String(r.accent), sortOrder: num(r.sort_order), pages: num(r.pages) }));
}

function mapPage(r: Record<string, unknown>): WikiPageSummary {
  return { id: num(r.id), slug: String(r.slug), title: String(r.title), summary: String(r.summary), clusterSlug: String(r.cluster_slug), clusterName: String(r.cluster_name), updatedAt: r.updated_at as Date | string, ...(r.is_published === undefined ? {} : { isPublished: Boolean(num(r.is_published)) }), ...(r.sort_order === undefined ? {} : { sortOrder: num(r.sort_order) }), ...(r.cluster_id === undefined ? {} : { clusterId: num(r.cluster_id) }) };
}

export async function listPublishedWikiPages(clusterSlug?: string, db: WikiDb = getPool()): Promise<WikiPageSummary[]> {
  const filter = clusterSlug ? "AND wc.slug = ?" : "";
  const [rows] = await db.query(`SELECT wp.id, wp.slug, wp.title, wp.summary, wc.slug AS cluster_slug, wc.name AS cluster_name, wp.updated_at FROM wiki_pages wp INNER JOIN wiki_clusters wc ON wc.id = wp.cluster_id WHERE wp.is_published = TRUE AND wp.deleted_at IS NULL ${filter} ORDER BY wc.sort_order, wp.sort_order, wp.title`, clusterSlug ? [clusterSlug] : []) as [Array<Record<string, unknown>>, unknown];
  return rows.map(mapPage);
}

export async function getPublishedWikiPage(slug: string, db: WikiDb = getPool()): Promise<WikiPageDetail | null> {
  const [rows] = await db.query(`SELECT wp.id, wp.slug, wp.title, wp.summary, wp.body, wp.updated_at, wc.slug AS cluster_slug, wc.name AS cluster_name FROM wiki_pages wp INNER JOIN wiki_clusters wc ON wc.id = wp.cluster_id WHERE wp.slug = ? AND wp.is_published = TRUE AND wp.deleted_at IS NULL LIMIT 1`, [slug]) as [Array<Record<string, unknown>>, unknown];
  return rows[0] ? { ...mapPage(rows[0]), body: String(rows[0].body) } : null;
}

export async function listAllWikiPages(filters: WikiAdminFilters = {}, db: WikiDb = getPool()): Promise<WikiAdminPage[]> {
  const conditions: string[] = ["wp.deleted_at IS NULL"];
  const params: unknown[] = [];
  const query = filters.query?.trim();
  if (query) {
    conditions.push("(wp.title LIKE ? OR wp.slug LIKE ?)");
    params.push(`%${query}%`, `%${query}%`);
  }
  if (filters.clusterId && Number.isInteger(filters.clusterId)) {
    conditions.push("wp.cluster_id = ?");
    params.push(filters.clusterId);
  }
  if (filters.status === "published" || filters.status === "draft") {
    conditions.push("wp.is_published = ?");
    params.push(filters.status === "published");
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.query(`SELECT wp.id, wp.cluster_id, wp.slug, wp.title, wp.summary, wp.is_published, wp.sort_order, wp.updated_at, wc.slug AS cluster_slug, wc.name AS cluster_name FROM wiki_pages wp INNER JOIN wiki_clusters wc ON wc.id = wp.cluster_id ${where} ORDER BY wc.sort_order, wp.sort_order, wp.title`, params) as [Array<Record<string, unknown>>, unknown];
  return rows.map(mapPage);
}

export async function getWikiAdminPageById(id: number, db: WikiDb = getPool()): Promise<WikiAdminPageDetail | null> {
  const [rows] = await db.query(`SELECT wp.id, wp.cluster_id, wp.slug, wp.title, wp.summary, wp.body, wp.is_published, wp.sort_order, wp.updated_at, wc.slug AS cluster_slug, wc.name AS cluster_name FROM wiki_pages wp INNER JOIN wiki_clusters wc ON wc.id = wp.cluster_id WHERE wp.id = ? AND wp.deleted_at IS NULL LIMIT 1`, [id]) as [Array<Record<string, unknown>>, unknown];
  return rows[0] ? { ...mapPage(rows[0]), body: String(rows[0].body) } : null;
}

export async function createWikiCluster(input: WikiClusterInput, db: WikiDb = getPool()) { const [r] = await db.execute("INSERT INTO wiki_clusters (name, slug, description, accent, sort_order) VALUES (?, ?, ?, ?, ?)", [input.name,input.slug,input.description,input.accent,input.sortOrder]); return Number((r as {insertId:number}).insertId); }
export async function updateWikiCluster(id: number, input: WikiClusterInput, db: WikiDb = getPool()) { await db.execute("UPDATE wiki_clusters SET name=?, slug=?, description=?, accent=?, sort_order=? WHERE id=?", [input.name,input.slug,input.description,input.accent,input.sortOrder,id]); }
export async function deleteWikiCluster(id: number, db: WikiDb = getPool()) { const [rows] = await db.query("SELECT COUNT(*) AS pages FROM wiki_pages WHERE cluster_id=?", [id]) as [Array<{pages:number|string}>,unknown]; if(num(rows[0]?.pages)>0) return {ok:false as const,status:409 as const,error:"Hãy chuyển hoặc xóa các bài trong cụm trước."}; await db.execute("DELETE FROM wiki_clusters WHERE id=?",[id]); return {ok:true as const}; }
export async function createWikiPage(authorId:number,input:WikiPageInput,db:WikiDb=getPool()){const [r]=await db.execute("INSERT INTO wiki_pages (cluster_id, author_id, slug, title, summary, body, section_name, is_published, sort_order) SELECT ?, ?, ?, ?, ?, ?, name, ?, ? FROM wiki_clusters WHERE id=?",[input.clusterId,authorId,input.slug,input.title,input.summary,input.body,input.isPublished,input.sortOrder,input.clusterId]);const result=r as {insertId:number;affectedRows?:number};if(!result.affectedRows&&!result.insertId)return {ok:false as const,status:400 as const,error:"Cụm Wiki không tồn tại."};const pageId=Number(result.insertId);const paths=extractWikiMediaPaths(input.body);if(paths.length){try{await db.execute(`UPDATE wiki_media SET page_id = ? WHERE page_id IS NULL AND path IN (${paths.map(()=>"?").join(", ")}) AND uploader_id = ?`,[pageId,...paths,authorId]);}catch{/* The article is already durable; unattached media remains renderable and can be reconciled later. */}}return {ok:true as const,pageId};}
export async function updateWikiPage(id:number,input:WikiPageInput,db:WikiDb=getPool()){await db.execute("UPDATE wiki_pages wp INNER JOIN wiki_clusters wc ON wc.id=? SET wp.cluster_id=?, wp.title=?, wp.slug=?, wp.summary=?, wp.body=?, wp.section_name=wc.name, wp.is_published=?, wp.sort_order=? WHERE wp.id=?",[input.clusterId,input.clusterId,input.title,input.slug,input.summary,input.body,input.isPublished,input.sortOrder,id]);}
export async function deleteWikiPage(id:number,db:WikiDb=getPool()){await db.execute("UPDATE wiki_pages SET deleted_at=NOW(),purge_after=DATE_ADD(NOW(),INTERVAL 30 DAY) WHERE id=?",[id]);}
