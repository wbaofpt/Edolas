# Community Profile, Forum and Wiki Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver database-backed profiles, forum posting/likes, and clustered staff-managed Wiki pages for EdolasSG.

**Architecture:** Keep profile, forum, and Wiki as focused service modules over the existing MySQL pool. Server pages read through services; route handlers resolve sessions and enforce authorization; small client components handle mutations and refresh server data.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL 8/mysql2, Tailwind CSS, Framer Motion, Node test runner.

## Global Constraints

- Preserve existing authentication and the electric sapphire visual system.
- Store uploaded avatars on the self-hosted VPS under `public/uploads/avatars`; accept JPG, PNG, or WebP up to 3 MB.
- Derive all profile counts from MySQL; do not ship fake counters.
- Restrict Wiki management to `role_name = staff` on the server.
- Use parameterized SQL, Vietnamese user-facing copy, keyboard-accessible controls, and reduced-motion fallbacks.
- Do not add third-party runtime dependencies.

---

### Task 1: Community Schema and Shared Authorization

**Files:**
- Create: `database/04_community.sql`
- Create: `lib/community/session-user.ts`
- Test: `tests/community-schema.test.mts`
- Test: `tests/community-session.test.mts`

**Interfaces:**
- Produces: `getRequestUser(request, deps?) -> Promise<PublicUser | null>` and `isStaff(user) -> boolean`.

- [ ] Write tests asserting the migration defines follows, likes, clusters, required indexes, and staff authorization helpers.
- [ ] Run focused tests and verify failure because files/functions do not exist.
- [ ] Add the additive SQL migration and request-session helpers.
- [ ] Run focused tests and verify success.

### Task 2: Profile Domain and Avatar Upload

**Files:**
- Create: `lib/profile/validation.ts`
- Create: `lib/profile/service.ts`
- Create: `lib/profile/http.ts`
- Create: `app/api/profile/me/route.ts`
- Create: `app/api/profile/avatar/route.ts`
- Create: `app/api/profile/[username]/follow/route.ts`
- Test: `tests/profile-validation.test.mts`
- Test: `tests/profile-service.test.mts`
- Test: `tests/profile-http.test.mts`

**Interfaces:**
- Produces: `getProfileByUsername`, `updateOwnProfile`, `toggleFollow`, `listProfileTopics`, `validateAvatarFile`, and route-handler factories.

- [ ] Write validator tests for bio/display-name bounds and PNG/JPEG/WebP magic bytes with a 3 MB cap.
- [ ] Run tests and verify expected missing-module failure.
- [ ] Implement validators and verify tests pass.
- [ ] Write service tests for database-derived counts, self-follow rejection, and idempotent follow toggles.
- [ ] Implement minimal parameterized queries and verify service tests pass.
- [ ] Write HTTP tests for missing sessions, profile updates, upload failures, and follow mutations.
- [ ] Implement route factories and concrete routes; verify focused tests pass.

### Task 3: Profile Interface and Header Entry

**Files:**
- Create: `app/profile/[username]/page.tsx`
- Create: `components/profile/profile-hero.tsx`
- Create: `components/profile/profile-actions.tsx`
- Create: `components/profile/profile-activity.tsx`
- Modify: `components/account-menu.tsx`
- Modify: `app/globals.css`
- Test: `tests/profile-ui.test.mts`

**Interfaces:**
- Consumes: profile service DTOs and `/api/profile/*` routes.

- [ ] Write UI contract tests for owner upload/edit controls, visitor follow control, real stats, and account-menu profile link.
- [ ] Run and verify failure.
- [ ] Build responsive server/client components with reduced-motion-aware transitions and accessible forms.
- [ ] Run UI tests and TypeScript.

### Task 4: Database-backed Forum

**Files:**
- Create: `lib/forum/validation.ts`
- Create: `lib/forum/service.ts`
- Create: `lib/forum/http.ts`
- Create: `app/api/forum/topics/route.ts`
- Create: `app/api/forum/topics/[id]/like/route.ts`
- Create: `app/forum/new/page.tsx`
- Create: `app/forum/[id]/page.tsx`
- Create: `components/forum/new-topic-form.tsx`
- Create: `components/forum/topic-like-button.tsx`
- Modify: `app/forum/page.tsx`
- Test: `tests/forum-service.test.mts`
- Test: `tests/forum-http.test.mts`
- Test: `tests/forum-ui.test.mts`

**Interfaces:**
- Produces: category/topic list DTOs, `createTopic`, `getTopic`, and `toggleTopicLike`.

- [ ] Write failing tests for title/content validation, authenticated creation, one-like-per-user toggling, and database list output.
- [ ] Implement forum validation/services/routes and verify service/HTTP tests.
- [ ] Write failing UI contracts for create page, topic detail, like feedback, and dynamic forum listing.
- [ ] Replace static forum data flow and add responsive forms/detail page.
- [ ] Run focused tests and TypeScript.

### Task 5: Clustered Wiki Reader and Staff Admin

**Files:**
- Create: `lib/wiki/validation.ts`
- Create: `lib/wiki/service.ts`
- Create: `lib/wiki/http.ts`
- Create: `app/api/wiki/clusters/route.ts`
- Create: `app/api/wiki/clusters/[id]/route.ts`
- Create: `app/api/wiki/pages/route.ts`
- Create: `app/api/wiki/pages/[id]/route.ts`
- Create: `app/wiki/[slug]/page.tsx`
- Create: `app/wiki/admin/page.tsx`
- Create: `components/wiki/wiki-browser.tsx`
- Create: `components/wiki/wiki-admin.tsx`
- Modify: `app/wiki/page.tsx`
- Test: `tests/wiki-service.test.mts`
- Test: `tests/wiki-http.test.mts`
- Test: `tests/wiki-ui.test.mts`

**Interfaces:**
- Produces: `listWikiClusters`, `listPublishedWikiPages`, `getPublishedWikiPage`, and staff CRUD operations.

- [ ] Write failing validation/service tests for cluster grouping, published filtering, slug validation, ordering, and CRUD.
- [ ] Implement Wiki domain functions and verify focused tests.
- [ ] Write failing HTTP authorization tests proving player and anonymous requests cannot administer Wiki.
- [ ] Implement staff-only route factories and verify HTTP tests.
- [ ] Write failing UI contracts for deep-linked cluster selection, article reading, and admin controls.
- [ ] Build the Wiki browser/article/admin interfaces and verify focused tests plus TypeScript.

### Task 6: Security Cleanup and Full Verification

**Files:**
- Modify: `.env.example`
- Modify: `database/01_schema.sql`
- Modify: `database/02_seed.sql`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: a clean setup path for new databases and safe environment examples.

- [ ] Replace credential-like values in `.env.example` with placeholders.
- [ ] Align canonical schema/seed files with migration `04_community.sql`.
- [ ] Run `npm test` and fix all failures without weakening assertions.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- [ ] Inspect changed files against the design spec and report any remaining deployment action, including revoking the exposed Gmail App Password and running the migration.

