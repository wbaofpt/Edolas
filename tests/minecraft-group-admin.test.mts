import test from "node:test";
import assert from "node:assert/strict";
import { deleteOfflineMinecraftGroup } from "../lib/minecraft/group-admin.ts";

const actor = { id: 1, username: "owner", displayName: "Owner", roleName: "owner", avatarUrl: null };
const now = new Date("2026-08-14T12:00:00.000Z");

function groupDb(rows: Array<{ server_id: string; last_seen_at: Date | string }>, failAt = "") {
  const calls: string[] = [];
  const parameters: unknown[][] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); if (failAt === "begin") throw new Error("database failed"); },
    async query(sql: string, params: unknown[]) {
      calls.push("lock"); parameters.push(params);
      assert.match(sql, /FOR UPDATE/);
      return [rows, undefined] as const;
    },
    async execute(sql: string, params: unknown[]) {
      const kind = sql.includes("SET TRANSACTION ISOLATION LEVEL") ? "isolation" : sql.includes("minecraft_telemetry_nonces") ? "nonces" : sql.includes("DELETE FROM minecraft_servers") ? "servers" : "audit";
      calls.push(kind); parameters.push(params);
      if (kind === failAt) throw new Error("database failed");
      return [{ affectedRows: kind === "servers" ? rows.length : 1 }, undefined] as const;
    },
    async commit() { calls.push("commit"); if (failAt === "commit") throw new Error("database failed"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  return { calls, parameters, db: { async getConnection() { return connection; } } };
}

test("offline Minecraft groups delete nonces, servers and record one audit atomically", async () => {
  const fixture = groupDb([
    { server_id: "survival-01", last_seen_at: "2026-08-14T11:59:20.000Z" },
    { server_id: "survival-02", last_seen_at: "2026-08-14T11:58:00.000Z" }
  ]);
  const result = await deleteOfflineMinecraftGroup(actor, "survival", fixture.db as never, now);
  assert.deepEqual(result, { ok: true, group: "survival", deletedServers: 2 });
  assert.deepEqual(fixture.calls, ["isolation", "begin", "lock", "nonces", "servers", "audit", "commit", "release"]);
  assert.deepEqual(fixture.parameters[1], ["survival"]);
  assert.deepEqual(fixture.parameters[2], ["survival-01", "survival-02"]);
  assert.deepEqual(fixture.parameters[3], ["survival"]);
  assert.match(String(fixture.parameters[4]?.[5]), /survival-01/);
});

test("Minecraft group deletion rejects missing and currently active groups", async () => {
  const missing = groupDb([]);
  assert.deepEqual(await deleteOfflineMinecraftGroup(actor, "missing", missing.db as never, now), {
    ok: false, status: 404, error: "Cụm máy chủ không tồn tại."
  });
  assert.deepEqual(missing.calls, ["isolation", "begin", "lock", "rollback", "release"]);

  const active = groupDb([
    { server_id: "survival-01", last_seen_at: "2026-08-14T11:59:20.000Z" },
    { server_id: "survival-02", last_seen_at: "2026-08-14T11:59:50.000Z" }
  ]);
  assert.deepEqual(await deleteOfflineMinecraftGroup(actor, "survival", active.db as never, now), {
    ok: false, status: 409, error: "Cụm vừa hoạt động trở lại nên không thể xóa."
  });
  assert.deepEqual(active.calls, ["isolation", "begin", "lock", "rollback", "release"]);
});

test("Minecraft group deletion rolls back when cleanup fails", async () => {
  const fixture = groupDb([{ server_id: "old-01", last_seen_at: "2026-08-14T11:00:00.000Z" }], "servers");
  await assert.rejects(() => deleteOfflineMinecraftGroup(actor, "old", fixture.db as never, now), /database failed/);
  assert.deepEqual(fixture.calls, ["isolation", "begin", "lock", "nonces", "servers", "rollback", "release"]);
});

test("Minecraft group deletion releases pooled connections for begin, audit and commit failures", async () => {
  for (const failure of ["begin", "audit", "commit"]) {
    const fixture = groupDb([{ server_id: "old-01", last_seen_at: "2026-08-14T11:00:00.000Z" }], failure);
    await assert.rejects(() => deleteOfflineMinecraftGroup(actor, "old", fixture.db as never, now), /database failed/);
    assert.equal(fixture.calls.at(-1), "release");
    if (failure === "begin") assert.deepEqual(fixture.calls, ["isolation", "begin", "release"]);
    else assert.ok(fixture.calls.includes("rollback"));
  }
});
