# Friendly Store Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a discoverable `Nạp thẻ` navigation item and turn `/store` into a clear, friendly, guided top-up experience.

**Architecture:** Preserve the existing `Storefront` state machine and `/api/store/orders` integration while reorganizing its presentation into intro, checkout, persistent summary, and order-history regions. Use the existing global CSS system and navigation data so desktop and mobile remain consistent without new dependencies.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Framer Motion, Lucide React, global CSS, Node test runner.

## Global Constraints

- Do not change the store API, database schema, admin workflow, payment simulation, or Paper delivery behavior.
- Use the existing Edolas colors and typography.
- Use Vietnamese user-facing copy and remove technical English section labels from `/store`.
- Preserve keyboard support, visible focus, reduced motion, and responsive behavior down to 375 px.
- Keep the change surgical and do not add dependencies.

---

### Task 1: Navigation Entry

**Files:**
- Modify: `tests/site-header-store.test.mts`
- Modify: `components/site-header.tsx`
- Modify: `lib/content.ts`

**Interfaces:**
- Consumes: `navItems: NavItem[]` from `lib/content.ts`.
- Produces: a desktop and mobile `/store` link labeled `Nạp thẻ` after `/game-modes`.

- [ ] **Step 1: Write the failing test**

Assert that `lib/content.ts` contains `{ href: "/store", label: "Nạp thẻ" }` after `/game-modes`, and that `site-header.tsx` no longer filters `/store` out of the classic navigation.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/site-header-store.test.mts`

Expected: FAIL because the label is still `Cửa hàng` and the header filters `/store`.

- [ ] **Step 3: Write minimal implementation**

Rename the navigation label and map `navItems` directly in both desktop and mobile navigation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/site-header-store.test.mts`

Expected: PASS.

### Task 2: Friendly Guided Checkout

**Files:**
- Modify: `tests/store-ui.test.mts`
- Modify: `components/store/storefront.tsx`

**Interfaces:**
- Consumes: `PublicStorePackage[]`, `PublicStoreOrder[]`, authentication state, and the existing order API response.
- Produces: the same order payload and behavior through a redesigned four-step interface.

- [ ] **Step 1: Write the failing test**

Assert the friendly progress labels, Vietnamese section copy, `store-friendly-summary`, `store-history`, and the absence of the previous technical labels.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/store-ui.test.mts`

Expected: FAIL because the persistent summary and friendly region names do not exist.

- [ ] **Step 3: Reorganize the component**

Keep current state and event handlers, then render:

- a concise intro,
- the four-step checkout,
- an always-visible summary with fallback values,
- recent orders in a separate full-width section below.

Use native buttons, `aria-pressed`, `aria-current`, linked errors, and existing login behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/store-ui.test.mts`

Expected: PASS.

### Task 3: Responsive Visual System

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: class names emitted by `Storefront`.
- Produces: desktop two-column checkout, sticky summary, mobile single-column flow, visible focus/selection states, and reduced-motion behavior.

- [ ] **Step 1: Add structural style assertions**

Extend `tests/store-ui.test.mts` to read `app/globals.css` and assert `.store-friendly-summary`, `.store-history`, a wide-screen layout rule, a narrow-screen rule, and `prefers-reduced-motion` coverage.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/store-ui.test.mts`

Expected: FAIL because the new selectors do not exist.

- [ ] **Step 3: Add the styles**

Append a focused override block using the existing palette. Keep text containers flexible, reserve summary space, use transform/opacity transitions only, and collapse to one column when the checkout no longer fits.

- [ ] **Step 4: Run focused tests**

Run: `node --experimental-strip-types --test tests/site-header-store.test.mts tests/store-ui.test.mts`

Expected: PASS.

### Task 4: Regression Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: the completed UI change.
- Produces: evidence that the redesign is safe to ship.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Run static checks**

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm run lint`

Expected: exit code 0 with no warnings.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit code 0 and `/store` builds successfully.

