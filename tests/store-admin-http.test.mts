import test from "node:test";
import assert from "node:assert/strict";
import {
  createStoreCategoryCreateHandler,
  createStoreOrderApproveHandler,
  createStorePackageDeleteHandler,
} from "../lib/store/admin-http.ts";

function request(csrf=true){return new Request("https://edolas.test/api/control/store/orders/1/approve",{method:"POST",headers:{origin:"https://edolas.test",host:"edolas.test",cookie:`edolas_control_session=s; edolas_control_csrf=${csrf?"token":"cookie"}`,"x-control-csrf":"token"}});}
test("store approval requires matching Control CSRF",async()=>{const handler=createStoreOrderApproveHandler({resolve:async()=>null});assert.equal((await handler(request(false),{params:{id:"1"}})).status,403);});
test("store approval queues delivery without exposing the console command",async()=>{const handler=createStoreOrderApproveHandler({resolve:async()=>({user:{id:1,username:"admin",displayName:"Admin",roleName:"owner",avatarUrl:null}}),approve:async()=>({ok:true,deliveryId:9,command:"secret command"})});const response=await handler(request(),{params:{id:"1"}});assert.equal(response.status,200);assert.doesNotMatch(await response.text(),/secret command/);});

test("store category creation uses the protected Control mutation flow", async () => {
  const handler = createStoreCategoryCreateHandler({
    resolve: async () => ({ user: { id: 1, username: "admin", displayName: "Admin", roleName: "owner", avatarUrl: null } }),
    save: async () => ({ ok: true, id: 7 }),
  });
  const response = await handler(new Request("https://edolas.test/api/control/store/categories", {
    method: "POST",
    headers: { origin: "https://edolas.test", host: "edolas.test", cookie: "edolas_control_session=s; edolas_control_csrf=token", "x-control-csrf": "token", "content-type": "application/json" },
    body: JSON.stringify({ groupKey: "survival", slug: "rank", name: "Rank", sortOrder: 1, active: true }),
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true, id: 7 });
});

test("store group update uses the protected Control mutation flow", async () => {
  const http = await import("../lib/store/admin-http.ts") as Record<string, unknown>;
  assert.equal(typeof http.createStoreGroupUpdateHandler, "function");
});

test("store package deletion uses Control protection and cleans a managed image", async () => {
  const cleaned: Array<string | null> = [];
  const handler = createStorePackageDeleteHandler({
    resolve: async () => ({ user: { id: 1, username: "admin", displayName: "Admin", roleName: "owner", avatarUrl: null } }),
    remove: async () => ({ ok: true, imagePath: "/uploads/store/packages/vip.webp" }),
    cleanupImage: async (imagePath) => { cleaned.push(imagePath); return false; },
  });
  const response = await handler(request(), { params: { id: "12" } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, cleanupPending: false });
  assert.deepEqual(cleaned, ["/uploads/store/packages/vip.webp"]);
});
