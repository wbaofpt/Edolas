# Wiki Admin Library Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the all-forms-at-once Wiki admin with a clear article library, dedicated editors, and focused cluster management.

**Architecture:** Server pages load filtered data through the Wiki service and continue to enforce staff access. Focused client components own the library actions, shared article editor, cluster editor, and confirmation dialog while reusing existing APIs.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL/mysql2, Tailwind CSS, Lucide icons.

## Global Constraints

- Preserve the current public Wiki, MySQL schema, staff authorization, and mutation API contracts.
- Keep filter state in URL query parameters.
- Use visible labels, keyboard focus, 44 px controls, `aria-live` feedback, and an accessible confirmation dialog.
- Do not add dependencies.

---

### Task 1: Filtered Admin Data

**Files:**
- Modify: `lib/wiki/service.ts`
- Test: `tests/wiki-service.test.mts`

**Interfaces:**
- Produces: `listAllWikiPages(filters?, db?)` and `getWikiAdminPageById(id, db?)`.

- [ ] Write failing tests proving filters become parameterized SQL values and one article includes its full body.
- [ ] Run the focused service tests and confirm failure for missing behavior.
- [ ] Implement the two service interfaces with parameterized queries.
- [ ] Run the focused tests and confirm success.

### Task 2: Article Library and Confirmation

**Files:**
- Create: `components/wiki/wiki-admin-library.tsx`
- Create: `components/wiki/wiki-confirm-dialog.tsx`
- Modify: `app/wiki/admin/page.tsx`
- Test: `tests/wiki-admin-redesign.test.mts`

**Interfaces:**
- Consumes: filtered `WikiAdminPage[]`, cluster list, and existing DELETE route.

- [ ] Write failing UI contracts for tabs, search/filter controls, responsive article rows, separate edit links, and deletion dialog.
- [ ] Replace the admin landing page with server-driven filters and the focused library component.
- [ ] Run the UI tests and TypeScript.

### Task 3: Dedicated Article Editor

**Files:**
- Create: `components/wiki/wiki-article-editor.tsx`
- Create: `app/wiki/admin/new/page.tsx`
- Create: `app/wiki/admin/[id]/page.tsx`
- Test: `tests/wiki-admin-redesign.test.mts`

**Interfaces:**
- Consumes: existing POST/PATCH APIs and `getWikiAdminPageById`.

- [ ] Add failing contracts for visible labels, publication controls, create redirect, and edit page data loading.
- [ ] Build the shared editor and two staff-only pages.
- [ ] Run focused tests, TypeScript, and lint.

### Task 4: Focused Cluster Management and Polish

**Files:**
- Create: `components/wiki/wiki-cluster-manager.tsx`
- Modify: `app/wiki/admin/page.tsx`
- Modify: `app/globals.css`
- Delete: `components/wiki/wiki-admin.tsx`
- Test: `tests/wiki-admin-redesign.test.mts`
- Test: `tests/wiki-ui.test.mts`

**Interfaces:**
- Consumes: existing cluster POST/PATCH/DELETE APIs and shared confirmation dialog.

- [ ] Write failing contracts for one-at-a-time create/edit behavior and cancel action.
- [ ] Implement the compact cluster list and focused editor.
- [ ] Add responsive dashboard styles and remove the obsolete all-in-one component.
- [ ] Run the complete test suite, TypeScript, lint, and production build.

