import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { CinematicPage } from "@/components/motion/cinematic-page";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/section-heading";
import { readPublicWebsiteContent } from "@/lib/public-website-content";

export default async function DisciplinePage() {
  const { rules } = await readPublicWebsiteContent();
  return (
    <CinematicPage className="mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <Reveal direction="left" className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground hover:text-primary focus-ring">
          <ArrowLeft className="h-4 w-4" />
          Quay về trang chủ
        </Link>
      </Reveal>
      <SectionHeading
        eyebrow="Kỉ luật"
        title="Kỉ luật rõ ràng để cộng đồng an toàn, chơi vui, và không bị mơ hồ."
        description="Mỗi quy định đi kèm lý do và mức độ để staff xử lý thống nhất, còn người chơi biết cách tránh vi phạm."
      />

      <StaggerGroup className="mt-10 grid gap-5">
        {rules.map((rule) => (
          <StaggerItem key={rule.code}><article className="card-outline rounded-[1.75rem] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">{rule.code}</p>
                  <h2 className="mt-2 text-xl font-semibold">{rule.title}</h2>
                </div>
              </div>
              <span className="rounded-full bg-muted px-4 py-2 text-sm font-semibold">{rule.severity}</span>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{rule.summary}</p>
          </article></StaggerItem>
        ))}
      </StaggerGroup>
    </CinematicPage>
  );
}
