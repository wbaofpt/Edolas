import type { WikiPageSummary } from "./service.ts";

export function getAdjacentWikiPages(pages: WikiPageSummary[], currentPageId: number) {
  const index = pages.findIndex((page) => page.id === currentPageId);
  if (index < 0) return { previous: null, next: null };
  return { previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
}
