import Link from "next/link";
import { ArrowLeft, ArrowRight, BookMarked, ChevronRight } from "lucide-react";
import type { WikiPageSummary } from "@/lib/wiki/service";
import { getAdjacentWikiPages } from "@/lib/wiki/navigation";

export type WikiClusterRailProps = { pages: WikiPageSummary[]; currentPageId: number; clusterName: string; clusterSlug: string; footerOnly?: boolean };

export function WikiClusterRail({ pages, currentPageId, clusterName, clusterSlug, footerOnly = false }: WikiClusterRailProps) {
  const { previous, next } = getAdjacentWikiPages(pages, currentPageId);
  const adjacent = <nav className="wiki-adjacent-pages" aria-label="Điều hướng bài Wiki">{previous ? <Link href={`/wiki/${previous.slug}`} className="wiki-adjacent-link is-previous focus-ring"><ArrowLeft className="h-4 w-4" aria-hidden="true" /><span><small>Bài trước</small><strong>{previous.title}</strong></span></Link> : <span />}{next ? <Link href={`/wiki/${next.slug}`} className="wiki-adjacent-link is-next focus-ring"><span><small>Bài tiếp theo</small><strong>{next.title}</strong></span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : null}</nav>;
  if (footerOnly) return adjacent;
  return <aside className="wiki-cluster-rail"><div className="wiki-cluster-rail-head"><span><BookMarked className="h-4 w-4" aria-hidden="true" /></span><div><p>Cụm Wiki</p><h2>{clusterName}</h2></div><strong>{pages.length.toLocaleString("vi-VN")}</strong></div><nav aria-label={`Các bài trong cụm ${clusterName}`}><ol className="wiki-cluster-rail-list">{pages.map((page, index) => { const current = page.id === currentPageId; return <li key={page.id}><Link href={`/wiki/${page.slug}`} aria-current={current ? "page" : undefined} className={`wiki-cluster-rail-link focus-ring ${current ? "is-current" : ""}`}><span className="wiki-cluster-rail-index">{String(index + 1).padStart(2, "0")}</span><span className="wiki-cluster-rail-copy"><strong>{page.title}</strong><small>{current ? "Đang đọc" : page.summary}</small></span><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></li>; })}</ol></nav><Link href={`/wiki?cluster=${encodeURIComponent(clusterSlug)}`} className="wiki-cluster-rail-all focus-ring">Xem toàn bộ cụm <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>{adjacent}</aside>;
}
