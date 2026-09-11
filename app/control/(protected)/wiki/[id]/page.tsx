import { notFound } from "next/navigation";
import { WikiArticleEditor } from "@/components/wiki/wiki-article-editor";
import { requireControlUser } from "@/lib/control/server-session";
import { getWikiAdminPageById, listWikiClusters } from "@/lib/wiki/service";

export default async function EditControlWikiArticlePage({ params }: { params: { id: string } }) {
  await requireControlUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const [page, clusters] = await Promise.all([
    getWikiAdminPageById(id).catch(() => null),
    listWikiClusters().catch(() => [])
  ]);
  if (!page) notFound();
  return <div><p className="font-pixel text-[10px] uppercase tracking-widest text-[#67E8F9]">WIKI STUDIO // CHỈNH SỬA</p><h1 className="mt-3 font-pixel text-2xl text-[#F8FAFC]">{page.title}</h1><p className="mb-8 mt-3 text-sm text-[#94A3B8]">Cập nhật nội dung, phân loại và trạng thái xuất bản.</p><WikiArticleEditor clusters={clusters} page={page} /></div>;
}
