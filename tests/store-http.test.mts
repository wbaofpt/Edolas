import test from "node:test";
import assert from "node:assert/strict";
import { createStoreCatalogHandler, createStoreOrdersPostHandler } from "../lib/store/http.ts";

const request = (body:unknown) => new Request("https://edolas.test/api/store/orders", { method:"POST", headers:{ origin:"https://edolas.test", host:"edolas.test", "content-type":"application/json" }, body:JSON.stringify(body) });

test("store order endpoint requires a signed-in website account", async () => {
  const handler = createStoreOrdersPostHandler({ getUser:async()=>null });
  assert.equal((await handler(request({}))).status, 401);
});

test("store order endpoint returns the safe public order projection", async () => {
  const handler = createStoreOrdersPostHandler({
    getUser:async()=>({id:1,username:"fff",displayName:"FFF",roleName:"player",avatarUrl:null}),
    createOrder:async()=>({ok:true,order:{id:1,reference:"EDO-1234567890",packageName:"VIP",groupKey:"survival",minecraftUsername:"QuocBaooo",paymentMethod:"momo",priceVnd:100000,status:"pending_payment",createdAt:"2026-08-14T00:00:00.000Z"}})
  });
  const response = await handler(request({packageId:1,minecraftUsername:"QuocBaooo",paymentMethod:"momo"}));
  assert.equal(response.status, 201);
  const body = await response.text();
  assert.doesNotMatch(body, /command/i);
  assert.match(body, /EDO-1234567890/);
});

test("store catalog endpoint exposes Store group labels separately from packages", async () => {
  const handler = createStoreCatalogHandler({
    listCatalog: async () => ({
      groups: [{ key: "op-skyblock", displayName: "Sky Realm", sortOrder: 0, online: true }],
      packages: [],
    }),
  });
  const response = await handler();
  assert.deepEqual(await response.json(), {
    ok: true,
    groups: [{ key: "op-skyblock", displayName: "Sky Realm", sortOrder: 0, online: true }],
    packages: [],
  });
});
