import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const authShellPath = new URL("../components/auth/auth-shell.tsx", import.meta.url);
const registerFormPath = new URL("../components/auth/register-form.tsx", import.meta.url);
const globalStylesPath = new URL("../app/globals.css", import.meta.url);

test("auth pages use the compact split-screen shell", async () => {
  const [shell, styles] = await Promise.all([
    readFile(authShellPath, "utf8"),
    readFile(globalStylesPath, "utf8")
  ]);

  assert.match(shell, /className="auth-visual"/);
  assert.match(shell, /className="auth-panel"/);
  assert.doesNotMatch(shell, /auth-hero-badges/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s+minmax\(28rem,\s*0\.95fr\)/);
});

test("registration fields use a responsive compact grid", async () => {
  const registerForm = await readFile(registerFormPath, "utf8");

  assert.match(registerForm, /className="auth-register-grid"/);
  assert.match(registerForm, /auth-field auth-field-wide/);
});

test("registration username input mirrors the server ASCII rule", async () => {
  const registerForm = await readFile(registerFormPath, "utf8");

  assert.match(registerForm, /pattern="\[A-Za-z0-9\]\{3,50\}"/);
  assert.match(registerForm, /minLength=\{3\}/);
  assert.match(registerForm, /maxLength=\{50\}/);
  assert.match(registerForm, /placeholder="EdolasPlayer26"/);
});
