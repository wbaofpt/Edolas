import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySession } from "../auth/service.ts";
import { SESSION_COOKIE_NAME } from "../auth/session.ts";
import { canManageContent } from "../admin/authorization.ts";

export async function requireWikiStaff() {
  const user = await getUserBySession(cookies().get(SESSION_COOKIE_NAME)?.value).catch(() => null);
  if (!user) redirect("/login");
  if (!canManageContent(user.roleName)) redirect("/wiki");
  return user;
}
