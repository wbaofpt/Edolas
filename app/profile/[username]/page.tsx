import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Network, SlidersHorizontal } from "lucide-react";
import { CinematicPage } from "@/components/motion/cinematic-page";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import { ProfileActions } from "@/components/profile/profile-actions";
import { ProfileActivity } from "@/components/profile/profile-activity";
import { ProfileHero, ProfileStats } from "@/components/profile/profile-hero";
import { ProfileConnections } from "@/components/profile/profile-connections";
import { getUserBySession } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { resolveProfileRoute } from "@/lib/profile/route";
import { getProfileByUsername, listOwnLikedTopics, listProfileConnections, listProfileTopics } from "@/lib/profile/service";

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const viewer = await getUserBySession(cookies().get(SESSION_COOKIE_NAME)?.value).catch(() => null);
  const route = resolveProfileRoute(params.username, viewer?.username);
  if (route.kind === "login") redirect("/login?next=/profile/%40me");

  const profile = await getProfileByUsername(route.username, viewer?.id).catch(() => null);
  if (!profile) notFound();
  const [topics, likedTopics, connections] = await Promise.all([
    listProfileTopics(profile.id).catch(() => []),
    profile.isOwner ? listOwnLikedTopics(profile.id, viewer?.id).catch(() => []) : Promise.resolve([]),
    listProfileConnections(profile.id).catch(() => ({ followers: [], following: [] }))
  ]);

  return (
    <CinematicPage className="profile-page-shell mx-auto w-full max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <Reveal direction="left">
        <Link href="/forum" className="profile-back-link focus-ring"><ArrowLeft aria-hidden="true" /> Cộng đồng Edolas</Link>
      </Reveal>

      <StaggerGroup className="profile-split-layout">
        <aside className="profile-identity-rail">
          <StaggerItem><ProfileHero profile={profile} /></StaggerItem>
          <StaggerItem>
            <section className="profile-network-panel">
              <header className="profile-panel-heading">
                <span><Network aria-hidden="true" /></span>
                <div><small>PLAYER NETWORK</small><h2>Mạng lưới cộng đồng</h2></div>
              </header>
              <ProfileConnections followers={connections.followers} following={connections.following} />
            </section>
          </StaggerItem>
        </aside>

        <section className="profile-main-column">
          <StaggerItem><ProfileStats profile={profile} /></StaggerItem>
          <StaggerItem>
            <section className="profile-editor-panel">
              <header className="profile-panel-heading">
                <span><SlidersHorizontal aria-hidden="true" /></span>
                <div><small>{profile.isOwner ? "PLAYER SETTINGS" : "SOCIAL LINK"}</small><h2>{profile.isOwner ? "Chỉnh sửa danh tính" : "Kết nối thành viên"}</h2></div>
              </header>
              <p className="profile-panel-description">{profile.isOwner ? "Cập nhật tên hiển thị, giới thiệu và ảnh đại diện trên toàn bộ cộng đồng Edolas." : `Theo dõi ${profile.displayName} để không bỏ lỡ hoạt động mới.`}</p>
              <ProfileActions username={profile.username} displayName={profile.displayName} bio={profile.bio} isOwner={profile.isOwner} isFollowing={profile.isFollowing} canFollow={Boolean(viewer)} />
            </section>
          </StaggerItem>
          <StaggerItem><ProfileActivity title="Bài viết diễn đàn" topics={topics} /></StaggerItem>
          {profile.isOwner ? <StaggerItem><ProfileActivity title="Bài viết đã thích" topics={likedTopics} /></StaggerItem> : null}
        </section>
      </StaggerGroup>
    </CinematicPage>
  );
}
