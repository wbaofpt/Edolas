# EdolasSG Auth Redesign and Data Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current auth mock with real login/register/logout flows, align the live MySQL schema with the app, and ship a split-portal cinematic auth experience that stays accessible and testable.

**Architecture:** Build small server-only helpers for password hashing, opaque session issuance, request validation, and MySQL transactions. Keep route handlers thin, make schema changes idempotent and auditable, and split the auth UI into dedicated login/register components that share one shell and one motion system.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, `mysql2/promise`, Node `node:test`, Tailwind CSS, Framer Motion.

## Global Constraints

- Preserve the existing `salt:hash` scrypt storage format.
- Generate a cryptographically random opaque token and store only its SHA-256 hash in MySQL.
- Send the raw token only in a cookie named `edolas_session`.
- Cookie attributes: `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
- Standard sessions expire after 24 hours; remembered sessions expire after 30 days.
- Keep the current in-memory verification store for this scope.
- Auth columns nullable so the three legacy seed users remain valid.
- Do not synthesize passwords or email addresses for legacy users.
- Login and registration responses never return session tokens in JSON.
- Motion uses opacity and transform only, is reduced on mobile, and is removed by `prefers-reduced-motion`.
- Git is unavailable in this workspace, so the plan ends with test/build evidence instead of commit steps.

## File Map

- `lib/auth/password.ts`: scrypt hash and verification helpers.
- `lib/auth/session.ts`: opaque token issuance, token hashing, expiry, and cookie options.
- `lib/auth/validation.ts`: request parsing and normalization for login/register/logout.
- `lib/auth/service.ts`: DB-backed auth orchestration and transaction boundaries.
- `database/03_auth.sql`: canonical schema migration.
- `scripts/apply-auth-migration.mts`: guarded migration runner for the live database.
- `scripts/inspect-auth-state.mts`: read-only schema/data audit and markdown report writer.
- `scripts/smoke-auth-flow.mts`: disposable end-to-end auth smoke test against local dev.
- `components/auth/auth-shell.tsx`: shared split-portal shell.
- `components/auth/login-form.tsx`: dedicated login UI.
- `components/auth/register-form.tsx`: dedicated two-step register UI.
- `components/auth-form.tsx`: temporary compatibility wrapper or removal after imports switch.
- `app/login/page.tsx`, `app/register/page.tsx`: route composition.
- `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/request-email-code/route.ts`, `app/api/auth/verify-email-code/route.ts`: HTTP entrypoints.
- `app/globals.css`: portal layout, focus states, reduced-motion handling, mobile collapse.
- `tests/auth-password.test.mts`, `tests/auth-session.test.mts`, `tests/auth-migration.test.mts`, `tests/auth-service.test.mts`: deterministic unit and contract coverage.
- `docs/superpowers/reports/2026-08-11-auth-data-audit.md`: pre/post migration evidence.

### Task 1: Password and Session Primitives

**Files:**
- Create `lib/auth/password.ts`
- Create `lib/auth/session.ts`
- Create `tests/auth-password.test.mts`
- Create `tests/auth-session.test.mts`

**Interfaces:**
- Produces `hashPassword(password: string): string`
- Produces `verifyPassword(password: string, stored: string): boolean`
- Produces `issueSession(now?: Date, remembered?: boolean): { rawToken: string; tokenHash: string; expiresAt: Date }`
- Produces `hashSessionToken(token: string): string`
- Produces `getSessionCookieOptions(expiresAt: Date): { httpOnly: true; sameSite: "lax"; secure: boolean; path: "/"; expires: Date; maxAge: number }`
- Consumers later rely on `SESSION_COOKIE_NAME = "edolas_session"`

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

test("hashPassword emits salt:hash and verifyPassword accepts the same password", () => {
  const hashed = hashPassword("Seismic#123");
  assert.match(hashed, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword("Seismic#123", hashed), true);
  assert.equal(verifyPassword("wrong", hashed), false);
});
```

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { issueSession, hashSessionToken, getSessionCookieOptions } from "@/lib/auth/session";

test("issueSession uses 24h and 30d expiries", () => {
  const base = new Date("2026-08-11T00:00:00Z");
  const normal = issueSession(base, false);
  const remembered = issueSession(base, true);
  assert.equal(normal.expiresAt.toISOString(), "2026-08-12T00:00:00.000Z");
  assert.equal(remembered.expiresAt.toISOString(), "2026-09-10T00:00:00.000Z");
  assert.match(normal.tokenHash, /^[0-9a-f]{64}$/);
  assert.match(hashSessionToken(normal.rawToken), /^[0-9a-f]{64}$/);
  assert.deepEqual(getSessionCookieOptions(normal.expiresAt).sameSite, "lax");
});
```

- [ ] **Step 2: Run the targeted tests to confirm they fail**

Run:
`node --experimental-strip-types --test tests/auth-password.test.mts`
`node --experimental-strip-types --test tests/auth-session.test.mts`

Expected: module-not-found or missing-export failures before implementation exists.

- [ ] **Step 3: Implement the minimal helpers**

Add the scrypt hashing and verification logic, SHA-256 session token hashing, 24h/30d expiry calculation, and cookie option builder. Keep these helpers server-only and make time injectable so the tests stay deterministic.

- [ ] **Step 4: Re-run the targeted tests**

Run:
`node --experimental-strip-types --test tests/auth-password.test.mts`
`node --experimental-strip-types --test tests/auth-session.test.mts`

Expected: both tests pass.

### Task 2: Schema Migration and Database Audit

**Files:**
- Modify `database/03_auth.sql`
- Create `scripts/apply-auth-migration.mts`
- Create `scripts/inspect-auth-state.mts`
- Create `tests/auth-migration.test.mts`
- Create `docs/superpowers/reports/2026-08-11-auth-data-audit.md`

**Interfaces:**
- Produces `applyAuthMigration(pool = getPool()): Promise<void>`
- Produces `collectAuthAudit(pool = getPool()): Promise<AuthAuditReport>`
- Produces `AuthAuditReport` with `users`, `sessions`, `schema`, and `orphans` counts

- [ ] **Step 1: Write the failing migration test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("03_auth.sql adds auth columns and auth_sessions", () => {
  const sql = readFileSync("database/03_auth.sql", "utf8");
  assert.match(sql, /ALTER TABLE users/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS email/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS password_hash/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS auth_sessions/i);
  assert.match(sql, /token_hash CHAR\(64\) NOT NULL UNIQUE/i);
  assert.match(sql, /ON DELETE CASCADE/i);
});
```

- [ ] **Step 2: Run the test to confirm the current SQL is incomplete**

Run:
`node --experimental-strip-types --test tests/auth-migration.test.mts`

Expected: the test should fail until the migration contains the required auth session DDL and the missing column/index coverage.

- [ ] **Step 3: Implement the guarded migration and audit script**

Make `scripts/apply-auth-migration.mts` inspect `information_schema` before executing DDL, so rerunning it is safe. Make `scripts/inspect-auth-state.mts` run read-only queries such as:

```sql
SELECT COUNT(*) AS total_users,
       SUM(email IS NULL) AS missing_email,
       COUNT(DISTINCT LOWER(email)) AS distinct_emails,
       SUM(password_hash IS NOT NULL AND email_verified_at IS NULL) AS unverified_password_rows
FROM users;

SELECT COUNT(*) AS total_sessions,
       SUM(expires_at <= NOW()) AS expired_sessions,
       COUNT(*) - COUNT(DISTINCT token_hash) AS duplicate_token_hashes,
       SUM(u.id IS NULL) AS orphan_sessions
FROM auth_sessions s
LEFT JOIN users u ON u.id = s.user_id;
```

Write the result to `docs/superpowers/reports/2026-08-11-auth-data-audit.md` so the before/after database state is preserved.

- [ ] **Step 4: Apply the migration and capture the audit**

Run:
`node --experimental-strip-types scripts/apply-auth-migration.mts`
`node --experimental-strip-types scripts/inspect-auth-state.mts`

Expected: the live schema now contains the auth columns and `auth_sessions`, and the audit report records the legacy seed users without inventing email or password data for them.

- [ ] **Step 5: Re-run the migration test**

Run:
`node --experimental-strip-types --test tests/auth-migration.test.mts`

Expected: pass.

### Task 3: DB-Backed Auth Service and HTTP Routes

**Files:**
- Create `lib/auth/validation.ts`
- Create `lib/auth/service.ts`
- Modify `app/api/auth/register/route.ts`
- Create `app/api/auth/login/route.ts`
- Create `app/api/auth/logout/route.ts`
- Modify `app/api/auth/request-email-code/route.ts`
- Modify `app/api/auth/verify-email-code/route.ts`
- Modify `lib/email-verification.ts`
- Create `tests/auth-service.test.mts`

**Interfaces:**
- Produces `normalizeIdentifier(value: string): string`
- Produces `parseLoginBody(body: unknown): { identifier: string; password: string; remember: boolean }`
- Produces `parseRegisterBody(body: unknown): { displayName: string; username: string; email: string; password: string; referralCode: string | null; remember: boolean }`
- Produces `loginUser(input, deps?): Promise<{ ok: true; user: PublicUser; sessionCookie: SessionCookieSpec } | { ok: false; status: 400 | 401 | 503; error: string }>`
- Produces `registerUser(input, deps?): Promise<{ ok: true; user: PublicUser; sessionCookie: SessionCookieSpec } | { ok: false; status: 400 | 409 | 503; error: string }>`
- Produces `logoutUser(rawToken: string, deps?): Promise<void>`
- Keeps `consumeVerification(email)` after commit and never before

- [ ] **Step 1: Write the failing service test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { registerUser } from "@/lib/auth/service";

test("registerUser commits before consuming verification", async () => {
  const calls: string[] = [];
  const fakeDb = makeFakeDb(calls);

  await registerUser(
    {
      displayName: "Storm Architect",
      username: "storm_architect",
      email: "storm@example.com",
      password: "Seismic#123",
      referralCode: null,
      remember: true
    },
    {
      db: fakeDb,
      now: new Date("2026-08-11T00:00:00Z"),
      verification: {
        isEmailVerified: () => true,
        consumeVerification: (email: string) => calls.push(`consume:${email}`)
      }
    }
  );

  assert.deepEqual(calls, ["begin", "insert-user", "insert-session", "commit", "consume:storm@example.com"]);
});
```

- [ ] **Step 2: Run the test to confirm the current route layer cannot satisfy it**

Run:
`node --experimental-strip-types --test tests/auth-service.test.mts`

Expected: failure until the service layer and transaction wiring exist.

- [ ] **Step 3: Implement the validation, service, and route handlers**

Build the request parsers, normalize login identifiers, perform DB lookups by username or email, and wire login/register/logout to the new session helpers. Keep invalid login responses generic, map duplicate username/email to 409, and return 503 for DB outages without leaking raw SQL errors.

- [ ] **Step 4: Re-run the service test**

Run:
`node --experimental-strip-types --test tests/auth-service.test.mts`

Expected: pass.

### Task 4: Split-Portal Auth UI and Accessibility

**Files:**
- Create `components/auth/auth-shell.tsx`
- Create `components/auth/login-form.tsx`
- Create `components/auth/register-form.tsx`
- Modify `components/auth-form.tsx`
- Modify `app/login/page.tsx`
- Modify `app/register/page.tsx`
- Modify `app/globals.css`

**Interfaces:**
- Produces `AuthShell({ eyebrow, title, description, highlights, children })`
- Produces a dedicated `LoginForm` with identifier, password, remember, loading, and error states
- Produces a dedicated `RegisterForm` with two visible steps, persistent field values, and email verification state
- Keeps field labels, IDs, `aria-invalid`, `aria-describedby`, and `aria-live` stable

- [ ] **Step 1: Split the shared shell from the form logic**

Move the left-side cinematic panel, server status, and account-benefit copy into `AuthShell`. Update `/login` and `/register` to render the shell plus the dedicated form for that route instead of the old all-in-one component.

- [ ] **Step 2: Split login and register interactions**

Keep login to one identifier field plus password and remember-device checkbox. Keep registration as two visible steps: account details first, then email verification. Preserve all entered values when moving between steps, and wire the send-code and verify-code actions to the existing auth routes.

- [ ] **Step 3: Add the accessibility and responsive polish**

Make every input have a persistent label and stable ID, keep password reveal buttons labeled, ensure decorative artwork is `aria-hidden`, and add CSS for the split portal, focus rings, stepper states, mobile collapse, and `prefers-reduced-motion`.

- [ ] **Step 4: Validate the UI build**

Run:
`npm run lint`
`npm run build`

Expected: no lint violations and a successful production build.

### Task 5: End-to-End Smoke and Final Verification

**Files:**
- Create `scripts/smoke-auth-flow.mts`
- Update `docs/superpowers/reports/2026-08-11-auth-data-audit.md`

**Interfaces:**
- Produces `runAuthSmoke(baseUrl = "http://127.0.0.1:3000"): Promise<void>`
- Reuses the live auth endpoints and cleans up disposable test data when possible
- Refuses to run against production

- [ ] **Step 1: Write the smoke harness**

The smoke script should:
1. Request a verification code for a disposable email in non-production.
2. Read the dev code from the response when available.
3. Verify the code.
4. Register a disposable account.
5. Log in with the username and with the email.
6. Log out and confirm the cookie is cleared.
7. Remove the disposable rows if the script created them.

- [ ] **Step 2: Run the smoke harness locally**

Run:
`node --experimental-strip-types scripts/smoke-auth-flow.mts`

Expected: the real auth stack passes end to end against the local development database.

- [ ] **Step 3: Run the full verification suite**

Run:
`npm test`
`npm run lint`
`npx tsc --noEmit`
`npm run build`

Expected: all commands succeed.

- [ ] **Step 4: Manually smoke the pages**

Open `/login` and `/register` at desktop and mobile widths, confirm keyboard focus order, confirm reduced motion removes the decorative animation, and confirm the success path redirects to the homepage.

## Self-Review

1. Spec coverage:
   - Passwords, session cookies, logout, and generic error handling are covered in Tasks 1 and 3.
   - Schema migration, data audit, and legacy seed-user preservation are covered in Task 2.
   - Split-portal UI, registration steps, accessibility, and motion constraints are covered in Task 4.
   - Live end-to-end verification is covered in Task 5.

2. Placeholder scan:
   - No `TBD`, `TODO`, or "fill in later" language is present.
   - Every task names the exact files and the actual commands to run.
   - The only conditional note is the explicit production guard in the smoke script.

3. Type consistency:
   - `issueSession`, `hashSessionToken`, and `getSessionCookieOptions` are used consistently across Tasks 1 and 3.
   - `loginUser`, `registerUser`, and `logoutUser` are the route-facing service entrypoints.
   - `AuthShell`, `LoginForm`, and `RegisterForm` remain the UI component names used by the page routes.

4. Gaps to watch during execution:
   - If index creation collides with the live schema state, fix it in `scripts/apply-auth-migration.mts` by checking `information_schema` before executing the DDL.
   - If the smoke script needs a cleanup path for a disposable user, keep that cleanup inside the script so the live DB does not accumulate test rows.

