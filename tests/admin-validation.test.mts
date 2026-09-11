import test from "node:test";
import assert from "node:assert/strict";
import { parseContentMutation, parseSettingsMutation, parseUserMutation } from "../lib/admin/validation.ts";

test("parses explicit user actions and rejects incomplete lock requests", () => {
  assert.deepEqual(parseUserMutation({ action: "role", role: "staff" }), { ok: true, value: { action: "role", role: "staff" } });
  assert.equal(parseUserMutation({ action: "lock", locked: true, reason: "" }).ok, false);
  assert.deepEqual(parseUserMutation({ action: "lock", locked: false }), { ok: true, value: { action: "lock", locked: false, reason: "" } });
  assert.deepEqual(parseUserMutation({ action: "revoke-sessions" }), { ok: true, value: { action: "revoke-sessions" } });
});

test("requires a destructive confirmation phrase for permanent deletion", () => {
  assert.deepEqual(parseContentMutation({ action: "trash" }), { ok: true, value: { action: "trash" } });
  assert.deepEqual(parseContentMutation({ action: "restore" }), { ok: true, value: { action: "restore" } });
  assert.equal(parseContentMutation({ action: "delete-permanently", confirmation: "delete" }).ok, false);
  assert.deepEqual(parseContentMutation({ action: "delete-permanently", confirmation: "XOA VINH VIEN" }), {
    ok: true,
    value: { action: "delete-permanently" }
  });
});

test("accepts only known non-secret settings with bounded values", () => {
  assert.deepEqual(parseSettingsMutation({ settings: { server_name: "Edolas SG", maintenance_mode: "true" } }), {
    ok: true,
    value: { server_name: "Edolas SG", maintenance_mode: "true" }
  });
  assert.equal(parseSettingsMutation({ settings: { gmail_app_password: "secret" } }).ok, false);
  assert.equal(parseSettingsMutation({ settings: { server_name: "" } }).ok, false);
  assert.deepEqual(parseSettingsMutation({ settings: { bedrock_ip: "be.edolas.vn", bedrock_port: "19132" } }), { ok: true, value: { bedrock_ip: "be.edolas.vn", bedrock_port: "19132" } });
  assert.equal(parseSettingsMutation({ settings: { bedrock_port: "70000" } }).ok, false);
});
