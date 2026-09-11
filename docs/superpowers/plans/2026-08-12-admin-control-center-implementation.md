# Edolas Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tao Control Center day du, an toan va de doc de nhom Edolas kiem soat tai khoan, noi dung, cau hinh va bao mat cua website.

**Architecture:** Quyen va chinh sach quan tri nam trong `lib/admin`, duoc dung chung boi Server Components va API handlers. Migration bo sung trang thai tai khoan, soft-delete, site settings va audit log; giao dien `/admin` dung server data cho lan tai dau va client controls cho mutations.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL 8, Tailwind CSS, Framer Motion, Lucide React, Node test runner.

## Global Constraints

- Owner duy nhat la username `edolas_admin`.
- Khoa tai khoan phai thu hoi moi session va giu nguyen noi dung.
- Soft-delete giu du lieu 30 ngay; permanent delete la thao tac rieng.
- Tat ca authorization nhay cam phai chay o server va ghi audit.
- Giu nguyen visual language va bang mau hien tai cua website.

---

### Task 1: Role Policy And Locked Sessions

**Files:**
- Create: `lib/admin/authorization.ts`
- Modify: `lib/auth/service.ts`
- Modify: `lib/wiki/admin-session.ts`
- Test: `tests/admin-authorization.test.mts`
- Test: `tests/auth-service.test.mts`

**Interfaces:**
- Produces: `normalizeAdminRole`, `canAccessAdmin`, `canManageContent`, `canManageUsers`, `canManageSettings`, `canAssignRole`.
- Changes session queries to require `account_status = 'active'`.

- [ ] Write tests for all four role levels, immutable Owner and locked login/session rejection.
- [ ] Run focused tests and confirm failures are caused by missing policy/status checks.
- [ ] Implement the minimal policy module and auth query/status handling.
- [ ] Run focused and full auth tests.

### Task 2: Idempotent Admin Schema

**Files:**
- Create: `lib/admin/schema.ts`
- Create: `scripts/migrate-admin-control.mts`
- Create: `database/06_admin_control.sql`
- Modify: `database/01_schema.sql`
- Modify: `package.json`
- Test: `tests/admin-schema.test.mts`

**Interfaces:**
- Produces: `applyAdminMigration(pool)` and `collectAdminSchemaSnapshot(pool)`.
- Adds users status fields, content soft-delete fields, `site_settings`, `admin_audit_logs`, and required indexes.

- [ ] Write source-contract and migration behavior tests.
- [ ] Run tests and confirm the migration API is missing.
- [ ] Implement replay-safe schema inspection and migration.
- [ ] Run schema tests and migration against configured MySQL when available.

### Task 3: Admin Data Services And Mutations

**Files:**
- Create: `lib/admin/service.ts`
- Create: `lib/admin/validation.ts`
- Test: `tests/admin-service.test.mts`
- Test: `tests/admin-validation.test.mts`

**Interfaces:**
- Produces: overview, user list, content list, settings and audit queries.
- Produces: `setUserLock`, `setUserRole`, `revokeUserSessions`, `setContentTrashState`, `permanentlyDeleteContent`, `updateSiteSettings`.

- [ ] Write failing tests for role boundaries, Owner protection, session revocation, trash retention and audit writes.
- [ ] Run focused tests and inspect expected failures.
- [ ] Implement transactions and parameterized queries with small typed result models.
- [ ] Run service tests and refactor only after green.

### Task 4: Protected Admin HTTP API

**Files:**
- Create: `lib/admin/http.ts`
- Create: `app/api/admin/users/[id]/route.ts`
- Create: `app/api/admin/content/[kind]/[id]/route.ts`
- Create: `app/api/admin/settings/route.ts`
- Test: `tests/admin-http.test.mts`

**Interfaces:**
- Consumes current request user and Task 3 mutations.
- Produces JSON `{ ok, data? }` or `{ ok: false, error }` with 400/401/403/404/409 statuses.

- [ ] Write failing route tests for unauthenticated, forbidden, malformed and successful requests.
- [ ] Run tests and verify red state.
- [ ] Implement shared guards and thin handlers.
- [ ] Run HTTP tests.

### Task 5: Control Center Shell And Dashboard

**Files:**
- Create: `lib/admin/session.ts`
- Create: `components/admin/admin-shell.tsx`
- Create: `components/admin/admin-dashboard.tsx`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/admin-ui.test.mts`

**Interfaces:**
- Protected layout redirects players and exposes role-aware navigation.
- Dashboard consumes overview and audit data from Task 3.

- [ ] Write structural/accessibility tests for navigation, landmarks, KPI labels and responsive controls.
- [ ] Run test and confirm missing UI.
- [ ] Build command-center shell and dashboard with semantic HTML and reduced-motion support.
- [ ] Run UI tests and typecheck.

### Task 6: Members, Content, Settings And Audit Screens

**Files:**
- Create: `components/admin/admin-user-table.tsx`
- Create: `components/admin/admin-content-table.tsx`
- Create: `components/admin/admin-settings-form.tsx`
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/content/page.tsx`
- Create: `app/admin/settings/page.tsx`
- Create: `app/admin/audit/page.tsx`
- Test: `tests/admin-ui.test.mts`

**Interfaces:**
- Client tables call Task 4 routes and refresh server data after success.
- Server pages perform role checks and return clear empty/error states.

- [ ] Expand failing UI tests for filters, dialogs, labels and permission-aware controls.
- [ ] Run tests and confirm red state.
- [ ] Implement responsive tables, confirmation panels, toasts and forms.
- [ ] Run UI tests, typecheck and accessibility checks.

### Task 7: Public Data Visibility And Account Menu

**Files:**
- Modify: `lib/forum/service.ts`
- Modify: `lib/wiki/service.ts`
- Modify: `components/account-menu.tsx`
- Modify: `app/globals.css`
- Test: `tests/forum-service.test.mts`
- Test: `tests/wiki-service.test.mts`
- Test: `tests/account-menu.test.mts`

**Interfaces:**
- Public list/detail queries exclude rows with `deleted_at`.
- Account menu uses `canAccessAdmin` to show Control Center only to authorized roles.

- [ ] Add failing tests for hidden trashed content and role-aware menu links.
- [ ] Run tests and verify red state.
- [ ] Apply query predicates and redesign the account menu.
- [ ] Run affected and full tests.

### Task 8: End-To-End Verification

**Files:**
- Modify only files required by verification findings.

- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run the admin migration and schema inspection when MySQL is reachable.
- [ ] Review responsive layout at 375px, 768px, 1024px and 1440px using available browser tooling or static CSS checks.
