import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("middleware marks control requests and sends hardened response headers",async()=>{
  const source=await read("middleware.ts");
  assert.match(source,/x-edolas-control-route/);
  assert.match(source,/Content-Security-Policy/);
  assert.match(source,/frame-ancestors 'none'/);
  assert.match(source,/Cache-Control.*no-store/s);
});

test("root layout omits public website chrome for the isolated control portal",async()=>{
  const source=await read("app/layout.tsx");
  assert.match(source,/x-edolas-control-route/);
  assert.match(source,/isControlRoute/);
  assert.match(source,/isControlRoute \? null : <CinematicLoader/);
  assert.match(source,/isControlRoute \? null : <SiteHeader/);
});

test("account menu opens control center in a separate tab",async()=>{
  const source=await read("components/account-menu.tsx");
  assert.match(source,/href="\/control"/);
  assert.match(source,/target="_blank"/);
  assert.match(source,/rel="noreferrer"/);
});

test("legacy admin routes redirect to control",async()=>{
  const pages=await Promise.all([
    read("app/admin/page.tsx"),read("app/admin/users/page.tsx"),
    read("app/admin/content/page.tsx"),read("app/admin/audit/page.tsx"),
    read("app/admin/settings/page.tsx")
  ]);
  for(const source of pages)assert.match(source,/redirect\("\/control/);
});
