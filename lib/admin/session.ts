import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySession } from "../auth/service.ts";
import { SESSION_COOKIE_NAME } from "../auth/session.ts";
import { canAccessAdmin, canManageSettings, canManageUsers } from "./authorization.ts";

export async function requireAdminUser() {
  const user = await getUserBySession(cookies().get(SESSION_COOKIE_NAME)?.value).catch(() => null);
  if (!user) redirect("/login");
  if (!canAccessAdmin(user.roleName)) redirect("/");
  return user;
}

export async function requireAccountAdmin() {
  const user = await requireAdminUser();
  if (!canManageUsers(user.roleName)) redirect("/admin");
  return user;
}

export async function requireSettingsAdmin() {
  const user = await requireAdminUser();
  if (!canManageSettings(user.roleName)) redirect("/admin");
  return user;
}
