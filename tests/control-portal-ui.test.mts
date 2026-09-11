import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("control access is a two-stage password and OTP experience", async () => {
  const [page, form] = await Promise.all([
    read("app/control/access/page.tsx"),
    read("components/control/control-access-form.tsx")
  ]);
  assert.match(page, /getUserBySession/);
  assert.match(page, /canAccessAdmin/);
  assert.match(page, /resolveControlSession/);
  assert.match(form, /type="password"/);
  assert.match(form, /inputMode="numeric"/);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /api\/control\/access\/password/);
  assert.match(form, /api\/control\/access\/otp/);
});

test("protected control layout requires the independent control session", async () => {
  const [layout, session] = await Promise.all([
    read("app/control/(protected)/layout.tsx"),
    read("lib/control/server-session.ts")
  ]);
  assert.match(layout, /requireControlUser/);
  assert.match(layout, /AdminShell/);
  assert.match(session, /CONTROL_SESSION_COOKIE/);
  assert.match(session, /resolveControlSession/);
  assert.match(session, /redirect\("\/control\/access"\)/);
});

test("control shell uses isolated navigation and can end only the control session", async () => {
  const source = await read("components/admin/admin-shell.tsx");
  assert.match(source, /href: "\/control"/);
  assert.doesNotMatch(source, /href: "\/admin/);
  assert.match(source, /controlFetch\("\/api\/control\/logout"/);
  assert.match(source, /Mở website/);
});
