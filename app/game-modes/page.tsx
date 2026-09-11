import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GameModeGrid } from "@/components/game-mode-grid";
import { CinematicPage } from "@/components/motion/cinematic-page";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/section-heading";
import { readPublicWebsiteContent } from "@/lib/public-website-content";

export default async function GameModesPage() {
  const { gameModes } = await readPublicWebsiteContent();
  return (
    <CinematicPage className="mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <Reveal direction="left" className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary focus-ring rounded-full px-2 py-1">
          <ArrowLeft className="h-4 w-4" />
          Quay về trang chủ
        </Link>
      </Reveal>
      <SectionHeading
        eyebrow="Chế độ chơi"
        title="Một danh mục chế độ chơi rõ ràng để người chơi chọn đúng trải nghiệm."
        description="Trang này có thể mở rộng thêm banner sự kiện, lịch reset mùa, và chi tiết server mode khi backend sẵn sàng."
      />
      <GameModeGrid modes={gameModes} variant="catalog" />
    </CinematicPage>
  );
}
