import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canManageSettings, canManageUsers } from "../admin/authorization";
import { CONTROL_SESSION_COOKIE } from "./session";
import { resolveControlSession } from "./session-service";

export async function readControlSession() {
  const token = cookies().get(CONTROL_SESSION_COOKIE)?.value;
  return resolveControlSession(token).catch(() => null);
}

export async function requireControlUser() {
  const session = await readControlSession();
  if (!session) redirect("/control/access");
  return session.user;
}

export async function requireControlAccountAdmin() {
  const user = await requireControlUser();
  if (!canManageUsers(user.roleName)) redirect("/control");
  return user;
}

export async function requireControlSettingsAdmin() {
  const user = await requireControlUser();
  if (!canManageSettings(user.roleName)) redirect("/control");
  return user;
}
