import Link from "next/link";
import { ArrowUpRight, FileText, Heart, MessageSquareText } from "lucide-react";
import type { ProfileTopic } from "@/lib/profile/service";

export function ProfileActivity({ title, topics }: { title: string; topics: ProfileTopic[] }) {
  return (
    <section className="profile-activity-panel">
      <header className="profile-section-heading">
        <span className="profile-section-icon"><FileText aria-hidden="true" /></span>
        <div><p>COMMUNITY LOG</p><h2 className="profile-section-title">{title}</h2></div>
        <span className="profile-section-count">{topics.length}</span>
      </header>
      <div className="profile-topic-list">
        {topics.length ? topics.map((topic) => (
          <Link key={topic.id} href={`/forum/${topic.id}`} className="profile-topic-row group focus-ring">
            <span className="profile-topic-index" aria-hidden="true">{String(topic.id).padStart(2, "0").slice(-2)}</span>
            <span className="profile-topic-copy"><small>{topic.category}</small><strong>{topic.title}</strong></span>
            <span className="profile-topic-metrics"><span><MessageSquareText aria-hidden="true" />{topic.replies}</span><span><Heart aria-hidden="true" />{topic.likes}</span></span>
            <ArrowUpRight className="profile-topic-arrow" aria-hidden="true" />
          </Link>
        )) : (
          <div className="profile-empty-state"><FileText aria-hidden="true" /><strong>Chưa có hoạt động</strong><p>Các bài viết mới sẽ xuất hiện tại đây.</p></div>
        )}
      </div>
    </section>
  );
}
