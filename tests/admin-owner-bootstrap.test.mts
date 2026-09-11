import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bootstrapOwner } from "../lib/admin/bootstrap.ts";

test("owner bootstrap requires strong explicit credentials", async () => {
  const result = await bootstrapOwner({ email: "bad", password: "short" }, { execute: async () => [{}, undefined] as const } as never);
  assert.equal(result.ok, false);
});

test("owner bootstrap only updates the fixed edolas_admin account", async () => {
  let sql = ""; let values: unknown[] = [];
  const result = await bootstrapOwner({ email: "owner@edolassg.vn", password: "Owner-Secure-Password-2026" }, {
    async execute(statement: string, params: unknown[]) { sql = statement; values = params; return [{ affectedRows: 1 }, undefined] as const; }
  } as never);
  assert.deepEqual(result, { ok: true });
  assert.match(sql, /WHERE username = 'edolas_admin'/);
  assert.equal(values.includes("Owner-Secure-Password-2026"), false);
  assert.equal(values[0], "owner@edolassg.vn");
});

test("owner bootstrap CLI loads local environment before reading credentials", async () => {
  const script = await readFile(new URL("../scripts/bootstrap-owner.mts", import.meta.url), "utf8");
  assert.match(script, /loadEnvFile/);
  assert.ok(script.indexOf("loadEnvFile") < script.indexOf("const email"));
});
