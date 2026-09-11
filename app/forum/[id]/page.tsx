import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Eye, MessageCircle, Share2 } from "lucide-react";
import { ForumSocial } from "@/components/forum/forum-social";
import { WikiContentRenderer } from "@/components/wiki/wiki-content-renderer";
import { CinematicPage } from "@/components/motion/cinematic-page";
import { getUserBySession } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getTopic } from "@/lib/forum/service";

export default async function TopicPage({ params }: { params: { id: string } }) {
  const user = await getUserBySession(cookies().get(SESSION_COOKIE_NAME)?.value).catch(() => null);
  const topic = await getTopic(Number(params.id), user?.id).catch(() => null);
  if (!topic) notFound();
  return <CinematicPage className="mx-auto max-w-5xl px-4 pb-20 pt-28"><Link href="/forum" className="text-sm font-bold text-[#67E8F9] focus-ring">&larr; Trở lại diễn đàn</Link><article className="profile-panel mt-7 overflow-hidden"><header className="forum-topic-hero border-b border-[#38BDF8]/15 p-6 sm:p-8"><span className="text-xs font-bold uppercase tracking-[.2em] text-[#38BDF8]">{topic.category}</span><h1 className="mt-4 font-pixel text-2xl leading-relaxed sm:text-4xl">{topic.title}</h1><div className="mt-5 flex flex-wrap gap-4 text-sm text-[#94A3B8]">{topic.authorUsername ? <Link href={`/profile/${topic.authorUsername}`} className="text-[#E0F2FE] hover:text-[#67E8F9]">{topic.author}</Link> : <span>Thành viên cũ</span>}<span className="inline-flex gap-1"><Eye className="h-4 w-4" />{topic.views}</span><span className="inline-flex gap-1"><MessageCircle className="h-4 w-4" />{topic.replies}</span><span className="inline-flex gap-1"><Share2 className="h-4 w-4" />{topic.shares}</span></div></header><div className="forum-topic-content p-6 text-base leading-8 text-[#CBD5E1] sm:p-8"><WikiContentRenderer content={topic.content} /></div><ForumSocial topicId={topic.id} liked={topic.liked} likes={topic.likes} shares={topic.shares} comments={topic.comments} enabled={Boolean(user)} canDelete={Boolean(user && topic.authorUsername === user.username)} /></article></CinematicPage>;
}
