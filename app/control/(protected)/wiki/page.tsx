import Link from "next/link";
import { BookOpen, ExternalLink, Layers3 } from "lucide-react";
import { WikiAdminLibrary } from "@/components/wiki/wiki-admin-library";
import { WikiClusterManager } from "@/components/wiki/wiki-cluster-manager";
import { requireControlUser } from "@/lib/control/server-session";
import { listAllWikiPages, listWikiClusters, type WikiAdminFilters } from "@/lib/wiki/service";

type SearchParams = { tab?: string; query?: string; cluster?: string; status?: string };

export default async function ControlWikiPage({ searchParams }: { searchParams: SearchParams }) {
  await requireControlUser();
  const clusterId = Number(searchParams.cluster);
  const status = searchParams.status === "published" || searchParams.status === "draft" ? searchParams.status : "all";
  const filters: WikiAdminFilters = {
    query: searchParams.query ?? "",
    clusterId: Number.isInteger(clusterId) && clusterId > 0 ? clusterId : undefined,
    status
  };
  const activeTab = searchParams.tab === "clusters" ? "clusters" : "articles";
  const [clusters, pages] = await Promise.all([
    listWikiClusters().catch(() => []),
    activeTab === "articles" ? listAllWikiPages(filters).catch(() => []) : Promise.resolve([])
  ]);

  return (
    <div className="space-y-6">
      <header className="wiki-admin-header">
        <div>
          <p className="font-pixel text-[10px] uppercase tracking-widest text-[#67E8F9]">KNOWLEDGE OPERATIONS</p>
          <h1 className="mt-3 font-pixel text-2xl text-[#F8FAFC]">Kho Wiki</h1>
          <p className="mt-3 text-sm text-[#94A3B8]">Soạn bài, tổ chức cụm và kiểm soát trạng thái xuất bản ngay trong phiên Control.</p>
        </div>
        <Link href="/wiki" target="_blank" rel="noreferrer" className="server-button server-button-dark px-5 py-3 focus-ring">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />Mở Wiki công khai
        </Link>
      </header>
      <nav className="wiki-admin-tabs" aria-label="Khu vực quản trị Wiki">
        <Link href="/control/wiki" aria-current={activeTab === "articles" ? "page" : undefined} className={`focus-ring ${activeTab === "articles" ? "is-active" : ""}`}>
          <BookOpen className="h-4 w-4" aria-hidden="true" /><span>Bài viết</span>
        </Link>
        <Link href="/control/wiki?tab=clusters" aria-current={activeTab === "clusters" ? "page" : undefined} className={`focus-ring ${activeTab === "clusters" ? "is-active" : ""}`}>
          <Layers3 className="h-4 w-4" aria-hidden="true" /><span>Cụm Wiki</span>
        </Link>
      </nav>
      {activeTab === "articles" ? (
        <WikiAdminLibrary pages={pages} clusters={clusters} filters={{ query: filters.query ?? "", cluster: filters.clusterId ? String(filters.clusterId) : "", status }} />
      ) : (
        <section className="wiki-admin-surface p-5 sm:p-7"><WikiClusterManager clusters={clusters} /></section>
      )}
    </div>
  );
}
