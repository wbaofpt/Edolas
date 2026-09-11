import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ProfileMember } from "@/lib/profile/service";

function MemberList({ title, members }: { title: string; members: ProfileMember[] }) {
  return <section className="profile-member-group"><h3>{title}<span>{members.length}</span></h3><div>{members.length ? members.map((member) => <Link key={member.username} href={`/profile/${member.username}`} className="profile-member-row focus-ring"><span className="profile-member-avatar">{member.displayName.charAt(0).toUpperCase()}{member.avatarUrl ? <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={member.avatarUrl} alt="" className="absolute inset-0 size-full object-cover" />
  </> : null}</span><span className="min-w-0"><strong>{member.displayName}</strong><small>@{member.username} · {member.roleName}</small></span><ArrowUpRight aria-hidden="true" /></Link>) : <p className="profile-members-empty">Chưa có thành viên.</p>}</div></section>;
}

export function ProfileConnections({ followers, following }: { followers: ProfileMember[]; following: ProfileMember[] }) {
  return <div className="profile-connections"><MemberList title="Người theo dõi" members={followers} /><MemberList title="Đang theo dõi" members={following} /></div>;
}
