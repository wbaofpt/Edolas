import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, BookOpenText, CheckCircle2, Flame, MessageSquareText, Shield, Sparkles, UserRound, Users } from "lucide-react";
import { AnimatedCard } from "@/components/animated-card";
import { CinematicHero } from "@/components/cinematic-hero";
import { GameModeGrid } from "@/components/game-mode-grid";
import { TiltCard } from "@/components/motion/tilt-card";
import { SectionHeading } from "@/components/section-heading";
import { forumTopics, wikiCards } from "@/lib/content";
import { readPublicSiteConfig } from "@/lib/admin/public-settings";
import { readPublicWebsiteContent } from "@/lib/public-website-content";
import { getUserBySession } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const highlights = [
  { icon: Shield, title: "Thế giới được bảo vệ", text: "Quy chuẩn rõ ràng, anti-cheat chủ động và đội ngũ hỗ trợ luôn có mặt." },
  { icon: Users, title: "Cộng đồng thật sự sống", text: "Kết nối với người chơi, cùng build, trade và tạo nên câu chuyện riêng." },
  { icon: BookOpenText, title: "Bắt đầu thật dễ", text: "Wiki, forum và hướng dẫn được sắp xếp để bạn vào game trong vài phút." },
  { icon: Sparkles, title: "Sự kiện mỗi tuần", text: "Quest, boss, mini-game và những phần thưởng chỉ có tại EdolasSG." }
];

export default async function HomePage() {
  const [siteConfig, websiteContent, user] = await Promise.all([
    readPublicSiteConfig(),
    readPublicWebsiteContent(),
    getUserBySession(cookies().get(SESSION_COOKIE_NAME)?.value).catch(() => null)
  ]);
  const { announcements, gameModes, heroStats, rules, minecraftStatus } = websiteContent;
  return (
    <div className="mystic-site">
      <CinematicHero discordUrl={siteConfig.discordUrl} serverIp={siteConfig.serverIp} bedrockIp={siteConfig.bedrockIp} bedrockPort={siteConfig.bedrockPort} maintenanceMode={siteConfig.maintenanceMode} networkStatus={minecraftStatus} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-24 px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <section id="about" className="grid scroll-mt-24 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionHeading eyebrow="Về EdolasSG" title="Nơi mỗi khối vuông đều có một câu chuyện." description="EdolasSG là một Minecraft network dành cho những người muốn chơi lâu dài, xây dựng tử tế và tìm thấy một cộng đồng để trở về." />
          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((stat, index) => <AnimatedCard key={stat.label} delay={index * 0.06}><div className="stat-panel"><p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">{stat.label}</p><p className="minecraft-display mt-2 text-4xl text-[#8B5CF6]">{stat.value}</p><p className="mt-1 text-sm text-[#94A3B8]">{stat.detail}</p></div></AnimatedCard>)}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, index) => { const Icon = item.icon; return <AnimatedCard key={item.title} delay={index * 0.07}><TiltCard className="h-full"><div className="mystic-card group h-full"><div className="mystic-icon"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-bold text-[#F8FAFC]">{item.title}</h3><p className="mt-2 text-sm leading-7 text-[#94A3B8]">{item.text}</p></div></TiltCard></AnimatedCard>; })}
        </section>

        <section id="modes" className="scroll-mt-24 space-y-8"><SectionHeading eyebrow="Chế độ chơi" title="Chọn cánh cổng, bước vào cuộc phiêu lưu." description="Mỗi mode mang một nhịp chơi riêng, nhưng cùng chung một hệ sinh thái EdolasSG." /><GameModeGrid modes={gameModes} /></section>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-8"><SectionHeading eyebrow="Cộng đồng" title="Tin mới từ những người đang xây Edolas." description="Theo dõi thông báo, thảo luận, guide và những câu chuyện mới nhất từ server." /><div className="grid gap-3">{forumTopics.map((topic) => <Link href="/forum" key={topic.title} className="topic-row focus-ring"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38BDF8]">{topic.category}</p><h3 className="mt-1 font-bold text-[#F8FAFC]">{topic.title}</h3></div><div className="text-right text-xs text-[#94A3B8]"><p>{topic.replies} replies</p><p>{topic.lastUpdate}</p></div></Link>)}</div><Link href="/forum" className="inline-flex items-center gap-2 text-sm font-bold text-[#67E8F9] hover:text-[#E0F2FE] focus-ring">Xem toàn bộ diễn đàn <ArrowRight className="h-4 w-4" /></Link></div><div className="mystic-card"><div className="flex items-center gap-3"><BookOpenText className="h-5 w-5 text-[#38BDF8]" /><p className="minecraft-title text-[10px] text-[#38BDF8]">WIKI HUB</p></div><div className="mt-6 grid gap-3">{wikiCards.map((item) => <Link href="/wiki" key={item.title} className="wiki-row focus-ring"><span className="text-xs text-[#38BDF8]">{item.tag}</span><span className="font-bold text-[#F8FAFC]">{item.title}</span><ArrowRight className="ml-auto h-4 w-4 text-[#94A3B8]" /></Link>)}</div></div></section>

        <section className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><SectionHeading eyebrow="Kỷ luật" title="Một thế giới vui bắt đầu từ sự tôn trọng." description="Luật rõ ràng giúp mọi người yên tâm chơi, build và giao dịch." /><Link href="/discipline" className="server-button mt-7 px-5 py-3 text-sm focus-ring">Đọc nội quy <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-3">{rules.map((rule) => <div key={rule.code} className="rule-row"><div><p className="text-xs font-bold text-[#38BDF8]">{rule.code}</p><h3 className="mt-1 font-bold text-[#F8FAFC]">{rule.title}</h3><p className="mt-1 text-sm text-[#94A3B8]">{rule.summary}</p></div><span className="text-xs font-bold text-[#f2bd6d]">{rule.severity}</span></div>)}</div></section>

        <section className="grid gap-4 lg:grid-cols-2"><div className="mystic-card"><div className="flex items-center gap-3"><Flame className="h-5 w-5 text-[#f2bd6d]" /><p className="minecraft-title text-[10px] text-[#f2bd6d]">THÔNG BÁO</p></div><div className="mt-6 grid gap-4">{announcements.map((item) => <article key={item.title} className="news-row"><p className="text-xs text-[#94A3B8]">{item.date}</p><h3 className="mt-1 font-bold text-[#F8FAFC]">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[#94A3B8]">{item.body}</p></article>)}</div></div><div className="mystic-card cinematic-cta home-member-cta flex flex-col justify-between"><div><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#67E8F9]" aria-hidden="true" /><p className="home-cta-kicker">{user ? "Phiên thành viên đang hoạt động" : "Sẵn sàng tham gia?"}</p></div><h2 className="home-cta-title">{user ? `Chào mừng trở lại, ${user.displayName}.` : "Hẹn gặp bạn trong game."}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#94A3B8]">{user ? "Hồ sơ, hoạt động diễn đàn và kết nối cộng đồng của bạn đã sẵn sàng." : "Đăng nhập, tham gia Discord và cùng cộng đồng viết chương tiếp theo của Edolas."}</p></div>{user ? (<div className="mt-8 flex flex-wrap gap-3"><Link href="/profile/@me" className="server-button px-5 py-3 text-sm focus-ring"><UserRound aria-hidden="true" className="h-4 w-4" />Hồ sơ của tôi</Link><Link href="/forum" className="server-button server-button-dark border-[#38BDF8]/20 px-5 py-3 text-sm focus-ring"><MessageSquareText aria-hidden="true" className="h-4 w-4" />Vào diễn đàn</Link></div>) : (<div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="server-button px-5 py-3 text-sm focus-ring">Tạo tài khoản</Link><Link href="/login" className="server-button server-button-dark border-[#38BDF8]/20 px-5 py-3 text-sm focus-ring">Đăng nhập</Link></div>)}</div></section>
      </main>
      <footer className="border-t border-[#38BDF8]/15 px-4 py-8 text-center text-sm text-[#94A3B8]"><span className="minecraft-title text-[10px] text-[#38BDF8]">EDOLASSG</span><span className="mx-2">•</span> Minecraft Network 2026</footer>
    </div>
  );
}
