import { searchSite, type SiteSearchResults } from "./service.ts";

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function createSearchHandler(deps: { search?: (term: string) => Promise<SiteSearchResults> } = {}) {
  return async (request: Request) => {
    const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (term.length < 2) return json(400, { ok: false, error: "Nhập ít nhất 2 ký tự để tìm kiếm." });
    if (term.length > 80) return json(400, { ok: false, error: "Từ khóa tìm kiếm quá dài." });
    const results = await (deps.search ?? searchSite)(term);
    return json(200, { ok: true, results });
  };
}
