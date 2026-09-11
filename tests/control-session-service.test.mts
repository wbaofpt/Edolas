import test from "node:test";
import assert from "node:assert/strict";
import { resolveControlSession } from "../lib/control/session-service.ts";
import { hashControlSecret } from "../lib/control/session.ts";

const activeRow = { id: 5, user_id: 2, csrf_hash: hashControlSecret("csrf"), expires_at: new Date("2026-08-12T14:00:00Z"), last_used_at: new Date("2026-08-12T11:45:00Z"), username: "admin", display_name: "Admin", role_name: "admin", avatar_url: null, account_status: "active" };

test("resolveControlSession rejects absent, expired and CSRF-mismatched control sessions", async () => {
  assert.equal(await resolveControlSession(undefined), null);
  const expiredCalls:string[]=[];
  const expired = { ...activeRow, last_used_at:new Date("2026-08-12T11:29:59Z") };
  assert.equal(await resolveControlSession("token",{db:{query:async()=>[[expired],undefined] as const,execute:async(sql:string)=>{expiredCalls.push(sql);return [{affectedRows:1},undefined] as const;}} as never,now:new Date("2026-08-12T12:00:00Z")}),null);
  assert.match(expiredCalls[0]??"",/DELETE FROM control_sessions/);
  assert.equal(await resolveControlSession("token",{db:{query:async()=>[[activeRow],undefined] as const,execute:async()=>[{affectedRows:1},undefined] as const} as never,csrfToken:"wrong",now:new Date("2026-08-12T12:00:00Z")}),null);
});

test("resolveControlSession returns current user and touches active sessions", async () => {
  const calls:string[]=[];
  const result=await resolveControlSession("token",{db:{query:async(_sql:string,values:unknown[])=>{assert.equal(values[0],hashControlSecret("token"));return [[activeRow],undefined] as const;},execute:async(sql:string)=>{calls.push(sql);return [{affectedRows:1},undefined] as const;}} as never,csrfToken:"csrf",now:new Date("2026-08-12T12:00:00Z")});
  assert.deepEqual(result?.user,{id:2,username:"admin",displayName:"Admin",roleName:"admin",avatarUrl:null});
  assert.match(calls[0]??"",/UPDATE control_sessions SET last_used_at/);
});
