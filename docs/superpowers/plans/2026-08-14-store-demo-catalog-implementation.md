# Store Demo Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current store catalog with a safe, image-led eight-package demonstration catalog for `op-skyblock` while preserving historical orders.

**Architecture:** Keep immutable demo definitions and transactional replacement logic in `lib/store/demo-seed.ts`. Keep `scripts/seed-store-demo.mts` as a thin executable wrapper so database behavior is directly testable without executing a process.

**Tech Stack:** TypeScript, Node.js, mysql2/promise, Node test runner, MySQL transactions.

## Global Constraints

- Replace only `store_packages` and `store_categories`.
- Preserve `store_orders` and `store_command_deliveries`.
- Require the `op-skyblock` backend group before destructive statements.
- Reuse existing `/uploads/game-modes/*.png` artwork.
- Every demo command uses a harmless one-line `say` template.
- Do not create fake financial or sales data.

---

### Task 1: Transactional Demo Catalog Seed

**Files:**
- Create: `tests/store-demo-seed.test.mts`
- Create: `lib/store/demo-seed.ts`

**Interfaces:**
- Produces: `STORE_DEMO_CATEGORIES`, `STORE_DEMO_PACKAGES`, and `replaceStoreWithDemoCatalog(db, groupKey = "op-skyblock")`.
- Returns: `{ categories: number; packages: number; groupKey: string }`.

- [ ] **Step 1: Write failing catalog-shape tests**

Assert five unique category slugs, eight unique package slugs, valid category references, local game-mode images, and commands beginning with `say`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/store-demo-seed.test.mts`

Expected: module-not-found failure for `lib/store/demo-seed.ts`.

- [ ] **Step 3: Write failing transaction tests**

Use a fake pooled connection to assert cluster lookup occurs before `DELETE FROM store_packages`, no order/delivery deletion is issued, success commits, and a missing group rolls back without catalog deletion.

- [ ] **Step 4: Implement immutable definitions and replacement transaction**

Create five categories and eight packages. Validate the group with a parameterized query, delete packages before categories, insert categories while retaining insert IDs, insert packages with parameterized values, commit on success, and rollback/release on all failures.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/store-demo-seed.test.mts`

Expected: all demo seed tests pass.

### Task 2: CLI and Database Application

**Files:**
- Create: `scripts/seed-store-demo.mts`
- Modify: `package.json`
- Modify: `tests/store-demo-seed.test.mts`

**Interfaces:**
- Produces npm command: `npm run db:seed:store-demo`.
- Consumes: `replaceStoreWithDemoCatalog(getPool(), "op-skyblock")`.

- [ ] **Step 1: Add a failing source-level CLI test**

Assert the script imports `getPool` and `replaceStoreWithDemoCatalog`, closes the pool in `finally`, and `package.json` exposes `db:seed:store-demo`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/store-demo-seed.test.mts`

Expected: missing script/package command assertions fail.

- [ ] **Step 3: Implement the thin CLI and package command**

Print only the inserted counts and target group. Do not print credentials, connection strings, command templates, or user data.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/store-demo-seed.test.mts`

Expected: all demo seed tests pass.

- [ ] **Step 5: Apply and inspect the seed**

Run: `npm run db:seed:store-demo`

Then query category/package counts and key display fields. Expected: five categories, eight packages, all packages target `op-skyblock`, and the old `nj` package is absent.

### Task 3: Full Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes the complete implementation and configured database.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 2: Run static checks**

Run: `npx tsc --noEmit` and `npm run lint`.

Expected: both commands exit successfully without warnings.

- [ ] **Step 3: Inspect final database rows**

Query `store_categories` and `store_packages` ordered by `sort_order`. Confirm five categories, eight packages, safe commands, local images, and no inserted orders.

