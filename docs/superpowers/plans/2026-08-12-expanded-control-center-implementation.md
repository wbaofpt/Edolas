# Expanded Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build real, secure management operations for content, forum categories, Wiki/media, sessions, audit filters, and dashboard metrics inside `/control`.

**Architecture:** Add small domain services behind the existing Control guard, then compose them into focused protected pages and client components. All bulk writes are bounded, transactional, role checked, and audited.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL 8, Tailwind CSS, Node test runner.

## Global Constraints

- Preserve the current Control Node design system and independent Control session.
- Never accept raw table names from clients.
- Limit bulk requests to 100 positive integer IDs.
- Use MySQL transactions and audit every mutation.
- Keep Owner and self-protection rules intact.
- Use test-first red/green cycles.

---

### Task 1: Content operation contracts

**Files:**
- Create: `lib/admin/content-operations.ts`
- Create: `tests/admin-content-operations.test.mts`
- Modify: `lib/admin/validation.ts`

- [ ] Write parser/service tests for bounded IDs, pin/move, publish/move, and bulk trash/restore.
- [ ] Run the focused test and verify missing contracts fail.
- [ ] Implement validated operation types and transactional service methods.
- [ ] Run the focused test and verify it passes.

### Task 2: Forum category management

**Files:**
- Create: `lib/admin/forum-categories.ts`
- Create: `tests/admin-forum-categories.test.mts`
- Create: `app/api/control/forum/categories/route.ts`
- Create: `app/api/control/forum/categories/[id]/route.ts`

- [ ] Test category validation, role checks, save auditing, and non-empty delete conflict.
- [ ] Implement the category service and guarded HTTP handlers.
- [ ] Verify focused service and HTTP tests.

### Task 3: Session operations and audit filters

**Files:**
- Create: `lib/admin/sessions.ts`
- Create: `tests/admin-sessions.test.mts`
- Create: `app/control/(protected)/sessions/page.tsx`
- Create: `app/api/control/sessions/[kind]/[id]/route.ts`
- Modify: `lib/admin/service.ts`
- Modify: `app/control/(protected)/audit/page.tsx`

- [ ] Test safe session metadata, protected-target revocation, and parameterized audit filtering.
- [ ] Implement list/revoke services and guarded endpoint.
- [ ] Add audit filter form and session page.
- [ ] Verify focused tests.

### Task 4: Expanded content UI and APIs

**Files:**
- Modify: `app/control/(protected)/content/page.tsx`
- Modify: `components/admin/admin-content-table.tsx`
- Create: `app/api/control/content/bulk/route.ts`
- Create: `app/api/control/content/[kind]/[id]/operation/route.ts`
- Create: `tests/admin-content-ui.test.mts`

- [ ] Test search/filter/bulk controls and operation labels.
- [ ] Implement guarded APIs and content toolbar/table/detail actions.
- [ ] Verify focused UI and HTTP tests.

### Task 5: Dashboard and navigation integration

**Files:**
- Modify: `lib/admin/service.ts`
- Modify: `components/admin/admin-dashboard.tsx`
- Modify: `components/admin/admin-shell.tsx`
- Modify: `tests/admin-ui.test.mts`

- [ ] Test new metrics and Sessions navigation visibility.
- [ ] Implement metrics and links while preserving role filters.
- [ ] Verify focused UI/service tests.

### Task 6: Full verification

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Review security boundaries and report any remaining operational limitations.
