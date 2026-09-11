import { CalendarDays, Heart, MessageSquareText, Radio, UserPlus, Users } from "lucide-react";
import type { CSSProperties } from "react";
import type { ProfileView } from "@/lib/profile/service";

export function ProfileHero({ profile }: { profile: ProfileView }) {
  const initial = profile.displayName.charAt(0).toUpperCase();
  return (
    <section className="profile-hero">
      <div className="profile-cover" aria-hidden="true">
        <span className="profile-grid" />
        <span className="profile-cover-orbit is-one" />
        <span className="profile-cover-orbit is-two" />
        <span className="profile-cover-code">EDOLAS // PLAYER DOSSIER</span>
      </div>
      <div className="profile-identity">
        <div className="profile-avatar">
          {initial}
          {profile.avatarUrl ? <>
            {/* Existing accounts may still contain remote avatar URLs, so a native image keeps backward compatibility. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.avatarUrl} alt={`Ảnh đại diện của ${profile.displayName}`} className="absolute inset-0 size-full object-cover" />
          </> : null}
          <span className="profile-avatar-online" aria-label="Đang hoạt động" />
        </div>

        <div className="profile-identity-copy">
          <div className="profile-name-row">
            <h1 className="profile-display-name">{profile.displayName}</h1>
            <span className="profile-role-badge">{profile.roleName}</span>
          </div>
          <p className="profile-handle"><Radio aria-hidden="true" /> @{profile.username}</p>
          <p className="profile-bio">{profile.bio || "Thành viên này chưa viết lời giới thiệu."}</p>
          <p className="profile-joined"><CalendarDays aria-hidden="true" />Tham gia {new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date(profile.createdAt))}</p>
        </div>
      </div>

    </section>
  );
}

export function ProfileStats({ profile }: { profile: ProfileView }) {
  const stats = [
    ["Bài viết", profile.stats.posts, MessageSquareText],
    ["Tổng thích", profile.stats.likes, Heart],
    ["Người theo dõi", profile.stats.followers, Users],
    ["Đang theo dõi", profile.stats.following, UserPlus]
  ] as const;

  return (
    <dl className="profile-signal-grid" aria-label="Thống kê hồ sơ">
      {stats.map(([label, value, Icon], index) => (
        <div key={label} className="profile-signal-card" style={{ "--stat-index": index } as CSSProperties}>
          <dt><Icon aria-hidden="true" /><span>{label}</span></dt>
          <dd>{new Intl.NumberFormat("vi-VN").format(value)}</dd>
          <span className="profile-signal-line" aria-hidden="true" />
        </div>
      ))}
    </dl>
  );
}
