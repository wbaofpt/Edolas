import { ForumCategoryManager } from "@/components/admin/forum-category-manager";
import { listForumCategories } from "@/lib/admin/forum-categories";
import { requireControlAccountAdmin } from "@/lib/control/server-session";

export default async function CategoriesPage() {
  await requireControlAccountAdmin();
  const categories = await listForumCategories().catch(() => []);
  return <div><header className="mb-7"><p className="font-pixel text-[10px] uppercase text-[#67E8F9]">FORUM ARCHITECTURE</p><h1 className="mt-3 text-balance font-pixel text-2xl text-[#F8FAFC]">Quản lý danh mục</h1><p className="mt-3 text-pretty text-sm text-[#94A3B8]">Tạo, chỉnh sửa và sắp xếp cấu trúc diễn đàn. Danh mục còn bài sẽ được bảo vệ khỏi việc xóa.</p></header><ForumCategoryManager categories={categories} /></div>;
}
