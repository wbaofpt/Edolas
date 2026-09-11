import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { CinematicPage } from "@/components/motion/cinematic-page";
import { WikiClusterRail } from "@/components/wiki/wiki-cluster-rail";
import { WikiContentRenderer } from "@/components/wiki/wiki-content-renderer";
import { WikiReaderTracker } from "@/components/wiki/wiki-reader-tracker";
import { getWikiReaderMetrics } from "@/lib/wiki/readers";
import { getPublishedWikiPage, listPublishedWikiPages } from "@/lib/wiki/service";

export default async function WikiArticlePage({ params }: { params: { slug: string } }) {
  const page = await getPublishedWikiPage(params.slug).catch(() => null);
  if (!page) notFound();
  const [metrics, clusterPages] = await Promise.all([
    getWikiReaderMetrics(page.id).catch(() => ({ totalOpens: 0, uniqueReaders: 0, activeReaders: 0 })),
    listPublishedWikiPages(page.clusterSlug).catch(() => [])
  ]);
  const railProps = { pages: clusterPages, currentPageId: page.id, clusterName: page.clusterName, clusterSlug: page.clusterSlug };
  return <CinematicPage className="mx-auto max-w-[88rem] px-4 pb-20 pt-28 sm:px-6"><Link href={`/wiki?cluster=${encodeURIComponent(page.clusterSlug)}`} className="text-sm font-bold text-[#67E8F9] focus-ring">← {page.clusterName}</Link><div className="wiki-article-layout mt-7"><WikiClusterRail {...railProps} /><article className="wiki-reading"><header className="border-b border-[#38BDF8]/15 p-6 sm:p-10"><div className="wiki-article-kicker"><BookOpenCheck className="h-6 w-6" aria-hidden="true" /><span>Edolas knowledge archive</span></div><p className="mt-5 text-xs font-bold uppercase tracking-[.25em] text-[#38BDF8]">{page.clusterName}</p><h1 className="mt-4 font-pixel text-2xl leading-relaxed text-[#F8FAFC] sm:text-4xl">{page.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-[#94A3B8]">{page.summary}</p><WikiReaderTracker pageId={page.id} initialMetrics={metrics} /></header><div className="wiki-prose p-6 sm:p-10"><WikiContentRenderer content={page.body} /></div><div className="wiki-mobile-adjacent"><WikiClusterRail {...railProps} footerOnly /></div></article></div></CinematicPage>;
}
