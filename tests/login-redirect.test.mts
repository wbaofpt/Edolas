import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeLoginRedirect } from "../lib/auth/login-redirect.ts";

test("login redirect accepts only local absolute paths", () => {
  const checkout =
    "/store?resume=1&username=QuocBaooo&group=survival&package=3&payment=momo";

  assert.equal(normalizeLoginRedirect(checkout), checkout);
  assert.equal(normalizeLoginRedirect("/profile/@me"), "/profile/@me");
  assert.equal(normalizeLoginRedirect("https://evil.example"), "/");
  assert.equal(normalizeLoginRedirect("//evil.example/path"), "/");
  assert.equal(normalizeLoginRedirect("\\\\evil.example/path"), "/");
  assert.equal(normalizeLoginRedirect("store"), "/");
  assert.equal(normalizeLoginRedirect(undefined), "/");
});

test("login page forwards the sanitized destination to the form", async () => {
  const [page, form] = await Promise.all([
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/auth/login-form.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(page, /normalizeLoginRedirect/);
  assert.match(page, /redirectTo=/);
  assert.match(form, /redirectTo/);
  assert.match(form, /router\.replace\(redirectTo\)/);
});
