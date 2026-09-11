export const ADMIN_ROLES = ["owner", "admin", "staff", "player"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

type RoleIdentity = {
  username: string;
  roleName: string;
};

export function normalizeAdminRole(role: unknown): AdminRole {
  const normalized = typeof role === "string" ? role.trim().toLowerCase() : "";
  return ADMIN_ROLES.includes(normalized as AdminRole) ? (normalized as AdminRole) : "player";
}

export function canAccessAdmin(role: unknown) {
  return normalizeAdminRole(role) !== "player";
}

export function canManageContent(role: unknown) {
  return canAccessAdmin(role);
}

export function canManageUsers(role: unknown) {
  const normalized = normalizeAdminRole(role);
  return normalized === "owner" || normalized === "admin";
}

export function canManageSettings(role: unknown) {
  return canManageUsers(role);
}

export function isProtectedOwner(identity: RoleIdentity) {
  return normalizeAdminRole(identity.roleName) === "owner";
}

export function canAssignRole(actorRole: unknown, targetRole: unknown, nextRole: unknown) {
  const actor = normalizeAdminRole(actorRole);
  const target = normalizeAdminRole(targetRole);
  const next = normalizeAdminRole(nextRole);

  if (target === "owner" || next === "owner") return false;
  if (actor === "owner") return true;
  if (actor !== "admin") return false;

  return (target === "staff" || target === "player") && (next === "staff" || next === "player");
}
