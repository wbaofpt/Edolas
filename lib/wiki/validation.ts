const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACCENTS = new Set(["cyan", "violet", "sapphire", "ice"]);
type Success<T> = { ok: true; value: T };
type Failure = { ok: false; error: string };

export type WikiClusterInput = { name: string; slug: string; description: string; accent: string; sortOrder: number };
export type WikiPageInput = { clusterId: number; title: string; slug: string; summary: string; body: string; isPublished: boolean; sortOrder: number };

export function parseWikiCluster(input: unknown): Success<WikiClusterInput> | Failure {
  if (!input || typeof input !== "object") return { ok: false, error: "Dữ liệu cụm Wiki không hợp lệ." };
  const data = input as Record<string, unknown>;
  const value = { name: typeof data.name === "string" ? data.name.trim() : "", slug: typeof data.slug === "string" ? data.slug.trim().toLowerCase() : "", description: typeof data.description === "string" ? data.description.trim() : "", accent: typeof data.accent === "string" ? data.accent : "cyan", sortOrder: Number(data.sortOrder) };
  if (value.name.length < 2 || value.name.length > 120) return { ok: false, error: "Tên cụm phải có từ 2 đến 120 ký tự." };
  if (!SLUG.test(value.slug) || value.slug.length > 80) return { ok: false, error: "Slug chỉ gồm chữ thường, số và dấu gạch ngang." };
  if (!value.description || value.description.length > 300) return { ok: false, error: "Mô tả cụm phải có từ 1 đến 300 ký tự." };
  if (!ACCENTS.has(value.accent)) return { ok: false, error: "Màu nhấn không hợp lệ." };
  if (!Number.isInteger(value.sortOrder) || Math.abs(value.sortOrder) > 10000) return { ok: false, error: "Thứ tự hiển thị không hợp lệ." };
  return { ok: true, value };
}

export function parseWikiPage(input: unknown): Success<WikiPageInput> | Failure {
  if (!input || typeof input !== "object") return { ok: false, error: "Dữ liệu bài Wiki không hợp lệ." };
  const data = input as Record<string, unknown>;
  const value = { clusterId: Number(data.clusterId), title: typeof data.title === "string" ? data.title.trim() : "", slug: typeof data.slug === "string" ? data.slug.trim().toLowerCase() : "", summary: typeof data.summary === "string" ? data.summary.trim() : "", body: typeof data.body === "string" ? data.body.trim() : "", isPublished: data.isPublished === true, sortOrder: Number(data.sortOrder) };
  if (!Number.isInteger(value.clusterId) || value.clusterId < 1) return { ok: false, error: "Vui lòng chọn cụm Wiki." };
  if (value.title.length < 4 || value.title.length > 160) return { ok: false, error: "Tiêu đề phải có từ 4 đến 160 ký tự." };
  if (!SLUG.test(value.slug) || value.slug.length > 80) return { ok: false, error: "Slug bài viết không hợp lệ." };
  if (value.summary.length < 8 || value.summary.length > 500) return { ok: false, error: "Tóm tắt phải có từ 8 đến 500 ký tự." };
  if (value.body.length < 20 || value.body.length > 100000) return { ok: false, error: "Nội dung phải có từ 20 đến 100.000 ký tự." };
  if (!Number.isInteger(value.sortOrder) || Math.abs(value.sortOrder) > 10000) return { ok: false, error: "Thứ tự hiển thị không hợp lệ." };
  return { ok: true, value };
}

