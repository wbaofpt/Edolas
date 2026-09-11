# Store Cluster Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến Store thành catalog nhiều cụm, mỗi cụm có tên Store tùy chỉnh, nhiều danh mục độc lập và giao diện quản trị rõ thứ bậc `Cụm -> Danh mục -> Gói`.

**Architecture:** Thêm `store_groups` làm metadata Store độc lập với telemetry và thêm `group_key` vào `store_categories`. Service quản trị chịu trách nhiệm bảo vệ quan hệ cùng cụm; public catalog trả tên cụm Store đã bật; client chỉ quản lý trạng thái chọn cụm/danh mục và gọi các API Control hiện có.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL 8, CSS hiện có, `Press Start 2P` qua `--font-pixel`, Node test runner.

## Global Constraints

- Tên tùy chỉnh chỉ xuất hiện trong Store và `/control/store`; không đổi telemetry, `/control/minecraft`, plugin Paper hoặc `group_key`.
- Giữ nguyên `store_orders` và `store_command_deliveries`.
- Không cho gói tham chiếu danh mục thuộc cụm khác.
- Font pixel chỉ dùng cho tên cụm và nhãn nhận diện ngắn; nội dung tiếng Việt dài dùng font sans.
- Mutation mới dùng Control session, same-origin CSRF, quyền account-admin và audit transaction hiện có.
- Không thêm dependency mới.

---

### Task 1: Store group schema and replay-safe migration

**Files:**
- Modify: `database/09_store.sql`
- Modify: `lib/store/schema.ts`
- Modify: `lib/store/demo-seed.ts`
- Test: `tests/store-schema.test.mts`
- Test: `tests/store-demo-seed.test.mts`

**Interfaces:**
- Produces: `CREATE_STORE_GROUPS_SQL` and replay-safe `applyStoreMigration(db)`.
- Produces schema fields `store_groups(group_key, display_name, sort_order, is_active, ...)` and `store_categories.group_key`.
- Demo seed inserts one `op-skyblock` Store group and categories scoped to that key.

- [ ] **Step 1: Write failing schema tests**

Assert the SQL defines `store_groups`, composite category uniqueness `(group_key,slug)`, and migration inspects/adds `store_categories.group_key`. Add a migration fake that proves reruns skip existing columns/indexes and mixed-group legacy categories fail before destructive DDL.

- [ ] **Step 2: Run RED tests**

Run: `node --experimental-strip-types --test tests/store-schema.test.mts tests/store-demo-seed.test.mts`

Expected: FAIL because `store_groups` and category `group_key` do not exist.

- [ ] **Step 3: Implement minimal schema and migration**

Create `store_groups`, reconcile existing rows from telemetry/packages, assign legacy categories deterministically, replace the old category slug index with `(group_key,slug)`, and update demo seed inserts to include `group_key`.

- [ ] **Step 4: Run GREEN tests**

Run the Task 1 command and expect all tests to pass.

- [ ] **Step 5: Migration checkpoint**

Run `npm run db:migrate:store` twice. Query `store_groups` and `store_categories` to verify `op-skyblock` exists and every category has a group. Do not modify order or delivery rows.

### Task 2: Validation, admin service and protected group API

**Files:**
- Modify: `lib/store/validation.ts`
- Modify: `lib/store/admin-service.ts`
- Modify: `lib/store/admin-http.ts`
- Create: `app/api/control/store/groups/[group]/route.ts`
- Test: `tests/store-validation.test.mts`
- Test: `tests/store-admin-service.test.mts`
- Test: `tests/store-admin-http.test.mts`

**Interfaces:**
- Produces: `StoreAdminGroup { key, displayName, sortOrder, active, online, categoryCount, packageCount, lastSeenAt }`.
- Produces: `parseStoreGroupInput(raw)` returning validated `displayName`, `sortOrder`, `active`.
- Produces: `saveStoreGroup(actor, groupKey, rawInput, db?)`.
- Changes: `StoreAdminCategory` gains `groupKey`.
- Produces: `createStoreGroupUpdateHandler()` for `PATCH /api/control/store/groups/:group`.

- [ ] **Step 1: Write failing validation and service tests**

Test valid Vietnamese display names, bounded names/orders, atomic group update + audit, category creation with group verification, category move rejection when packages exist, and package/category group mismatch returning `409`.

- [ ] **Step 2: Run RED tests**

Run: `node --experimental-strip-types --test tests/store-validation.test.mts tests/store-admin-service.test.mts tests/store-admin-http.test.mts`

Expected: FAIL because group APIs/types and cross-group checks are absent.

- [ ] **Step 3: Implement service boundaries**

Extend the admin projection queries with Store metadata and counts. Add one transaction-backed `saveStoreGroup`; make category/package saves lock and validate their owning group before writes; preserve duplicate-slug conflict handling.

- [ ] **Step 4: Implement protected route**

Add the PATCH handler using the shared `authorize()` flow. Return only `{ ok: true, group }` or bounded errors; never return SQL details.

- [ ] **Step 5: Run GREEN tests**

Run the Task 2 command and expect all tests to pass.

### Task 3: Public catalog grouping and Store display names

**Files:**
- Modify: `lib/store/service.ts`
- Modify: `lib/store/http.ts`
- Modify: `app/store/page.tsx`
- Modify: `components/store/storefront.tsx`
- Test: `tests/store-service.test.mts`
- Test: `tests/store-http.test.mts`
- Test: `tests/store-ui.test.mts`

**Interfaces:**
- Produces: `PublicStoreGroup { key, displayName, online, sortOrder }`.
- Produces: `listStoreCatalog()` result `{ groups: PublicStoreGroup[]; packages: PublicStorePackage[] }`.
- `Storefront` consumes explicit `groups` and displays `group.displayName` instead of formatting `group_key`.

- [ ] **Step 1: Write failing public catalog tests**

Test that disabled Store groups are excluded, category joins include matching `group_key`, duplicate category slugs across groups remain separate, and display names reach the client UI.

- [ ] **Step 2: Run RED tests**

Run: `node --experimental-strip-types --test tests/store-service.test.mts tests/store-ui.test.mts`

Expected: FAIL because catalog currently returns only a package array and derives labels from keys.

- [ ] **Step 3: Implement catalog projection**

Read active `store_groups`, join packages/categories on both category id and group key, preserve telemetry online calculation, and update the page/component/API contract. Order creation must lock and require an active `store_groups` row so a hidden cluster cannot be purchased through a direct POST.

- [ ] **Step 4: Run GREEN tests**

Run the Task 3 command and expect all tests to pass.

### Task 4: Cluster-first Control Store interface

**Files:**
- Modify: `components/control/store-manager.tsx`
- Modify: `app/globals.css`
- Test: `tests/control-store-ui.test.mts`

**Interfaces:**
- Consumes: `StoreAdminGroup[]`, grouped `StoreAdminCategory[]`, `StoreAdminPackage[]`.
- Produces client behavior for selecting a group/category, editing Store group metadata, filtering package cards, and resetting invalid category selection when a package changes group.

- [ ] **Step 1: Write failing UI source tests**

Assert the component contains a group selector, editable Store display name, `aria-pressed` selection state, per-group category filtering, the group PATCH endpoint, and a dedicated pixel-font class for cluster names.

- [ ] **Step 2: Run RED test**

Run: `node --experimental-strip-types --test tests/control-store-ui.test.mts`

Expected: FAIL because the current page is a flat category and package list.

- [ ] **Step 3: Implement hierarchy and forms**

Add the cluster rail, selected-cluster summary, scoped category manager and responsive package grid. Keep the order queue below, retaining its filters and confirmation dialogs. Use native dialog semantics and existing `controlFetch`.

- [ ] **Step 4: Apply focused styling**

Use existing palette tokens and borders. Apply `var(--font-pixel)` only to `.control-store-cluster-name` and short kickers; use tabular numbers for prices/KPIs; keep 44 px controls; collapse the catalog grid based on content fit.

- [ ] **Step 5: Run GREEN test**

Run the Task 4 command and expect all tests to pass.

### Task 5: End-to-end verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run focused Store tests**

Run: `node --experimental-strip-types --test tests/store-*.test.mts tests/control-store-ui.test.mts`

- [ ] **Step 2: Run project checks**

Run: `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

- [ ] **Step 3: Verify live database invariants**

Confirm each category has a valid Store group, all package/category group pairs match, order and delivery counts remain unchanged, and updating `OP Skyblock` changes only `store_groups.display_name`.

- [ ] **Step 4: Visual stress check**

Open `/control/store` at desktop and narrow viewport widths. Verify rail overflow cue, keyboard focus, dialog focus behavior, Vietnamese wrapping, package image clarity and empty states.

## Execution Note

This workspace does not contain `.git`, so implementation checkpoints are verified with tests and database queries rather than commits. No destructive Git operation is required.
