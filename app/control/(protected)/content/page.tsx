import { AdminContentTable } from "@/components/admin/admin-content-table";
import { listAdminContent, type ContentKind } from "@/lib/admin/service";
import { listForumCategories } from "@/lib/admin/forum-categories";
import { listWikiClusters } from "@/lib/wiki/service";
import { requireControlUser } from "@/lib/control/server-session";

export default async function ContentPage({ searchParams }: { searchParams: { kind?: string; trash?: string; query?: string; status?: string } }) {
  const actor = await requireControlUser();
  const kind = ["forum", "wiki", "media"].includes(searchParams.kind ?? "") ? searchParams.kind as ContentKind : "all";
  const trash = searchParams.trash === "1";
  const [items, categories, clusters] = await Promise.all([
    listAdminContent({ kind, trash, query: searchParams.query, status: searchParams.status }).catch(() => []),
    listForumCategories().catch(() => []),
    listWikiClusters().catch(() => [])
  ]);
  return <div><header className="mb-7"><p className="font-pixel text-[10px] uppercase tracking-widest text-[#67E8F9]">CONTENT OPERATIONS</p><h1 className="mt-3 text-balance font-pixel text-2xl text-[#F8FAFC]">Trung tâm nội dung</h1><p className="mt-3 text-pretty text-sm text-[#94A3B8]">Kiểm duyệt diễn đàn, Wiki và media với thao tác hàng loạt và thùng rác an toàn 30 ngày.</p></header><AdminContentTable items={items} categories={categories} clusters={clusters} actorRole={actor.roleName} trash={trash} filters={{ query: searchParams.query ?? "", kind, status: searchParams.status ?? "all" }} /></div>;
}
