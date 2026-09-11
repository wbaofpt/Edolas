type Result = { ok: true; value: { categoryId: number; title: string; content: string } } | { ok: false; error: string };

export function parseNewTopic(input: unknown): Result {
  if (!input || typeof input !== "object") return { ok: false, error: "Dữ liệu bài viết không hợp lệ." };
  const body = input as Record<string, unknown>;
  const categoryId = Number(body.categoryId);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!Number.isInteger(categoryId) || categoryId < 1) return { ok: false, error: "Vui lòng chọn chuyên mục." };
  if (title.length < 8 || title.length > 200) return { ok: false, error: "Tiêu đề phải có từ 8 đến 200 ký tự." };
  if (content.length < 20 || content.length > 30000) return { ok: false, error: "Nội dung phải có từ 20 đến 30.000 ký tự." };
  return { ok: true, value: { categoryId, title, content } };
}

export function parseForumComment(input: unknown) {
  if (!input || typeof input !== "object") return { ok: false as const, error: "Dữ liệu bình luận không hợp lệ." };
  const body = input as Record<string, unknown>;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const parentId = body.parentId == null || body.parentId === "" ? null : Number(body.parentId);
  if (content.length < 1 || content.length > 2000) return { ok: false as const, error: "Bình luận phải dài từ 1 đến 2.000 ký tự." };
  if (parentId !== null && (!Number.isInteger(parentId) || parentId < 1)) return { ok: false as const, error: "Bình luận trả lời không hợp lệ." };
  return { ok: true as const, value: { content, parentId } };
}
