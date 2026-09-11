import { WikiArticleEditor } from "@/components/wiki/wiki-article-editor";
import { requireControlUser } from "@/lib/control/server-session";
import { listWikiClusters } from "@/lib/wiki/service";

export default async function NewControlWikiArticlePage() {
  await requireControlUser();
  const clusters = await listWikiClusters().catch(() => []);
  return <div><p className="font-pixel text-[10px] uppercase tracking-widest text-[#67E8F9]">WIKI STUDIO // BÀI MỚI</p><h1 className="mt-3 font-pixel text-2xl text-[#F8FAFC]">Tạo bài hướng dẫn</h1><p className="mb-8 mt-3 text-sm text-[#94A3B8]">Viết nội dung, chèn media rồi chọn cụm và trạng thái xuất bản.</p><WikiArticleEditor clusters={clusters} /></div>;
}
