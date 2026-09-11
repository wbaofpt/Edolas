import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessAdmin,
  canAssignRole,
  canManageContent,
  canManageSettings,
  canManageUsers,
  isProtectedOwner,
  normalizeAdminRole
} from "../lib/admin/authorization.ts";

test("normalizes unknown database roles to player", () => {
  assert.equal(normalizeAdminRole("owner"), "owner");
  assert.equal(normalizeAdminRole("ADMIN"), "admin");
  assert.equal(normalizeAdminRole("moderator"), "player");
  assert.equal(normalizeAdminRole(null), "player");
});

test("grants each role only its fixed control-center capabilities", () => {
  assert.deepEqual(
    ["owner", "admin", "staff", "player"].map((role) => ({
      role,
      access: canAccessAdmin(role),
      content: canManageContent(role),
      users: canManageUsers(role),
      settings: canManageSettings(role)
    })),
    [
      { role: "owner", access: true, content: true, users: true, settings: true },
      { role: "admin", access: true, content: true, users: true, settings: true },
      { role: "staff", access: true, content: true, users: false, settings: false },
      { role: "player", access: false, content: false, users: false, settings: false }
    ]
  );
});

test("protects the unique owner and prevents admins from managing peers", () => {
  assert.equal(isProtectedOwner({ username: "edolas_admin", roleName: "owner" }), true);
  assert.equal(isProtectedOwner({ username: "other", roleName: "owner" }), true);
  assert.equal(canAssignRole("owner", "staff", "admin"), true);
  assert.equal(canAssignRole("owner", "owner", "admin"), false);
  assert.equal(canAssignRole("owner", "player", "owner"), false);
  assert.equal(canAssignRole("admin", "staff", "player"), true);
  assert.equal(canAssignRole("admin", "player", "staff"), true);
  assert.equal(canAssignRole("admin", "admin", "staff"), false);
  assert.equal(canAssignRole("admin", "staff", "admin"), false);
  assert.equal(canAssignRole("staff", "player", "staff"), false);
});
