# Hybrid Store Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an image-led, categorized Edolas package catalog with a hybrid desktop checkout and full Control management.

**Architecture:** Extend the current store package model with catalog-only metadata while leaving order snapshots and command delivery unchanged. Keep category CRUD, managed image storage, Control presentation, and public presentation behind separate modules and routes so each can be tested independently.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL 8, global CSS, Lucide React, Node test runner.

## Global Constraints

- One package per order; no cart or quantity model.
- Do not change order command snapshots, approval, delivery queue, or Paper plugin behavior.
- Managed images are JPG, PNG, or WebP, at most 5 MB, stored under `public/uploads/store/packages`.
- Public catalog responses never expose command templates or admin ownership fields.
- All Control mutations require the existing Control CSRF/session guard and account-admin role.
- Existing packages without new metadata remain usable.
- No new runtime dependency.

---

### Task 1: Catalog Schema And Public Mapping

**Files:**
- Modify: `tests/store-schema.test.mts`
- Modify: `tests/store-validation.test.mts`
- Modify: `tests/store-service.test.mts`
- Modify: `database/09_store.sql`
- Modify: `lib/store/schema.ts`
- Modify: `lib/store/validation.ts`
- Modify: `lib/store/service.ts`

**Interfaces:**
- Produces `StoreCategoryInput`, package metadata fields, and expanded `PublicStorePackage` values.
- Preserves `StoreOrderInput` and `createStoreOrder` payloads unchanged.

- [ ] Write failing tests for category SQL, replay-safe package columns, metadata validation, category mapping, image path mapping, featured state, badge, and fulfilled sold count.
- [ ] Run `node --experimental-strip-types --test tests/store-schema.test.mts tests/store-validation.test.mts tests/store-service.test.mts` and verify failures describe missing catalog metadata.
- [ ] Add replay-safe schema changes, validators, public types, and catalog query mapping.
- [ ] Re-run the focused tests and verify they pass.

### Task 2: Category Administration

**Files:**
- Modify: `tests/store-admin-service.test.mts`
- Modify: `tests/store-admin-http.test.mts`
- Modify: `lib/store/admin-service.ts`
- Modify: `lib/store/admin-http.ts`
- Create: `app/api/control/store/categories/route.ts`
- Create: `app/api/control/store/categories/[id]/route.ts`

**Interfaces:**
- Produces `StoreAdminCategory`, `saveStoreCategory`, and `deleteStoreCategory`.
- Category handlers return only `{ ok, id? }` or bounded errors.

- [ ] Write failing tests for account-admin authorization, category create/update mapping, delete conflicts, and safe HTTP dispatch.
- [ ] Run the two focused tests and verify they fail for missing category behavior.
- [ ] Implement transactional category CRUD and audit records using the existing Control guard.
- [ ] Re-run the focused tests and verify they pass.

### Task 3: Managed Package Images

**Files:**
- Create: `tests/store-package-image.test.mts`
- Create: `tests/store-package-image-http.test.mts`
- Create: `lib/store/package-image.ts`
- Create: `lib/store/package-image-http.ts`
- Create: `app/api/control/store/packages/[id]/image/route.ts`

**Interfaces:**
- Produces `validateStorePackageImage(bytes, size)` and `updateStorePackageImage(actor, packageId, imagePath)`.
- HTTP handler supports `POST` for upload and `DELETE` for removal.

- [ ] Write failing tests for signatures, 5 MB size, managed path validation, Control authorization, replacement cleanup, and rollback cleanup.
- [ ] Run the image tests and verify they fail because the modules do not exist.
- [ ] Implement managed image validation, storage, database update, audit, and cleanup.
- [ ] Re-run the image tests and verify they pass.

### Task 4: Control Catalog Manager

**Files:**
- Modify: `tests/control-store-ui.test.mts`
- Modify: `components/control/store-manager.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes expanded `listStoreAdminData()` with packages, categories, orders, and groups.
- Calls category CRUD, package save, and package image routes through `controlFetch`.

- [ ] Write failing source tests for category management, category assignment, badge, featured state, image preview/upload/removal, accessible dialogs, and visible status feedback.
- [ ] Run `node --experimental-strip-types --test tests/control-store-ui.test.mts` and verify it fails.
- [ ] Extend the package editor and add a compact category manager using native controls and existing dialog patterns.
- [ ] Add focused Control Store styles and re-run the test.

### Task 5: Hybrid Public Store

**Files:**
- Modify: `tests/store-ui.test.mts`
- Modify: `components/store/storefront.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes expanded `PublicStorePackage[]`.
- Still submits `{ packageId, minecraftUsername, paymentMethod }` to `POST /api/store/orders`.

- [ ] Write failing tests for the featured rail, category tabs, image fallback, sold count, hybrid desktop layout, selected package summary, mobile step flow, and reduced motion.
- [ ] Run the store UI test and verify it fails for the new catalog requirements.
- [ ] Implement category filtering and image-led cards while preserving checkout validation and login resume.
- [ ] Add responsive/motion styles and re-run focused store tests.

### Task 6: Migration And Regression Verification

**Files:**
- Verify all modified files.

**Interfaces:**
- Produces release evidence only.

- [ ] Run `npm run db:migrate:store` against the configured local database and verify successful replay.
- [ ] Run `npm test` and verify zero failures.
- [ ] Run `npx tsc --noEmit` and verify exit code 0.
- [ ] Run `npm run lint` and verify exit code 0 with no warnings.
- [ ] Run `npm run build` and verify `/store`, `/control/store`, and new API routes build successfully.

