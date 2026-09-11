# Header Portal Crest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely replace the header block emblem with the approved Portal Crest logo.

**Architecture:** Add a header-only inline SVG branch to `BrandWordmark`; preserve the existing shared markup for hero and loader. Replace, rather than layer over, the obsolete header logo CSS.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS, inline SVG, Node test runner.

## Global Constraints

- Do not change Home or loader wordmarks.
- Do not keep the old `E` tile, two-row copy, divider, or network label.
- Do not add dependencies or raster assets.
- Respect reduced motion and keep motion limited to transform and opacity.

---

### Task 1: Portal Crest Contract

**Files:**
- Modify: `tests/brand-wordmark.test.mts`

- [ ] Require the portal SVG, ring, core, and one-line name classes.
- [ ] Reject the old block-emblem classes in component and stylesheet source.
- [ ] Run the focused test and confirm it fails on the current logo.

### Task 2: Portal Crest Implementation

**Files:**
- Modify: `components/brand-wordmark.tsx`
- Modify: `app/globals.css`

- [ ] Replace the header branch with semantic decorative SVG markup and one-line wordmark copy.
- [ ] Remove all superseded block-emblem styles.
- [ ] Add responsive portal geometry and hover/focus sweep styles.
- [ ] Run the focused test and TypeScript check.

### Task 3: Integration Verification

**Files:**
- Verify all modified files.

- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
