import test from "node:test";
import assert from "node:assert/strict";
import { createControlWikiClusterPostHandler, createControlWikiMediaUploadHandler } from "../lib/control/wiki-http.ts";

const staff = { id: 3, username: "staff", displayName: "Staff", roleName: "staff", avatarUrl: null };
const session = { user: staff, expiresAt: new Date("2026-08-13T00:00:00Z") };

function mutationRequest(path: string, body: BodyInit, contentType?: string) {
  return new Request(`https://edolas.vn${path}`, {
    method: "POST",
    headers: {
      origin: "https://edolas.vn",
      host: "edolas.vn",
      cookie: "edolas_control_session=session; edolas_control_csrf=csrf",
      "x-control-csrf": "csrf",
      ...(contentType ? { "content-type": contentType } : {})
    },
    body
  });
}

test("control wiki mutations reject requests without same-origin CSRF proof", async () => {
  const handler = createControlWikiClusterPostHandler({
    resolveControlSession: async () => session as never,
    createWikiCluster: async () => 4
  });
  const response = await handler(new Request("https://edolas.vn/api/control/wiki/clusters", {
    method: "POST",
    headers: { cookie: "edolas_control_session=session" },
    body: "{}"
  }));
  assert.equal(response.status, 403);
});

test("staff control session can create a validated Wiki cluster and records an audit", async () => {
  let slug = "";
  let auditAction = "";
  const handler = createControlWikiClusterPostHandler({
    resolveControlSession: async () => session as never,
    createWikiCluster: async (input) => { slug = input.slug; return 4; },
    recordAudit: async (_actor, action) => { auditAction = action; }
  });
  const response = await handler(mutationRequest(
    "/api/control/wiki/clusters",
    JSON.stringify({ name: "Survival", slug: "survival", description: "Huong dan Survival", accent: "cyan", sortOrder: 10 }),
    "application/json"
  ));
  assert.equal(response.status, 201);
  assert.equal(slug, "survival");
  assert.equal(auditAction, "wiki.cluster.create");
});

test("Wiki mutation and audit roll back together when audit persistence fails", async () => {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async query() { return [[], undefined] as const; },
    async execute(sql: string) {
      if (sql.includes("admin_audit_logs")) { calls.push("audit"); throw new Error("audit unavailable"); }
      calls.push("mutation"); return [{ insertId: 4, affectedRows: 1 }, undefined] as const;
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  const handler = createControlWikiClusterPostHandler({ resolveControlSession: async () => session as never, db: { getConnection: async () => connection } as never });
  await assert.rejects(() => handler(mutationRequest("/api/control/wiki/clusters", JSON.stringify({ name: "Survival", slug: "survival", description: "Huong dan Survival", accent: "cyan", sortOrder: 10 }), "application/json")), /audit unavailable/);
  assert.deepEqual(calls, ["begin", "mutation", "audit", "rollback", "release"]);
});

test("control Wiki media upload applies the same guard before parsing multipart data", async () => {
  const handler = createControlWikiMediaUploadHandler({ resolveControlSession: async () => session as never });
  const response = await handler(new Request("https://edolas.vn/api/control/wiki/media", {
    method: "POST",
    headers: {
      origin: "https://edolas.vn",
      host: "edolas.vn",
      cookie: "edolas_control_session=session; edolas_control_csrf=csrf",
      "x-control-csrf": "csrf",
      "content-length": String(52 * 1024 * 1024)
    }
  }));
  assert.equal(response.status, 413);
});
