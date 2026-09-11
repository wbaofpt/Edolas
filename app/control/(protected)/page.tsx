import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminOverview, listAuditLogs } from "@/lib/admin/service";

const empty = { users: 0, activeUsers: 0, lockedUsers: 0, activeSessions: 0, forumTopics: 0, wikiPages: 0, mediaFiles: 0, trashItems: 0, pinnedTopics: 0, draftWikiPages: 0, unattachedMedia: 0, expiringTrash: 0 };

export default async function ControlPage() {
  const [overview, audit] = await Promise.all([getAdminOverview().catch(() => empty), listAuditLogs(8).catch(() => [])]);
  return <AdminDashboard overview={overview} audit={audit} />;
}
