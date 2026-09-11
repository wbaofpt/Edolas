# Synchronized Loader Wordmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize all loader animation with progress, hide scrollbars for the loader lifetime, and implement the approved pixel-glitch wordmark.

**Architecture:** Add a tested `idle|running` presentation state separate from the loader completion state. A first-frame React transition starts both Framer progress and CSS animations through `data-motion`; shared wordmark markup exposes separate EDOLAS, SG, and season elements for responsive styling.

**Tech Stack:** Next.js 14, React 18, TypeScript, Framer Motion 11, CSS, Node test runner.

## Global Constraints

- No new image, font, or animation dependency.
- Large-surface motion uses transform and opacity only.
- Decorative glitches stop when progress completes and are disabled for reduced motion.
- Header retains the same shared wordmark without season copy or repeating glitch.
- Workspace has no Git repository, so commit steps do not apply.

---

### Task 1: Lock the synchronized motion contract

**Files:**
- Modify: `tests/cinematic-loader.test.mts`
- Create: `tests/cinematic-loader-ui.test.mts`
- Modify: `lib/cinematic-loader.ts`
- Modify: `components/motion/cinematic-loader.tsx`

- [ ] Add a failing test for `getCinematicMotionState(false) === "idle"` and `getCinematicMotionState(true) === "running"`.
- [ ] Add failing source tests for `data-motion`, `requestAnimationFrame`, dual-root overflow locking, and CSS `:has()` scroll lock.
- [ ] Implement the pure motion-state helper.
- [ ] Start motion on the first animation frame and use that state for progress and the loader data attribute.
- [ ] Lock and restore overflow on both HTML and body.
- [ ] Run focused loader tests.

### Task 2: Build the reference-inspired wordmark

**Files:**
- Modify: `tests/brand-wordmark.test.mts`
- Modify: `components/brand-wordmark.tsx`
- Modify: `app/globals.css`

- [ ] Add failing assertions for season metadata and separate EDOLAS/SG text pieces.
- [ ] Add the season and wordmark piece markup.
- [ ] Style the cyan metadata, compressed white/purple main line, hard shadows, and responsive header variant.
- [ ] Add two finite glitch slices and a finite cyan sweep under `data-motion="running"` only.
- [ ] Pause all cinematic CSS animations in idle and start them together in running.
- [ ] Run wordmark, loader UI, and palette tests.

### Task 3: Verify runtime and production

**Files:**
- Verify all files changed by Tasks 1 and 2.

- [ ] Run TypeScript and ESLint.
- [ ] Run all tests.
- [ ] Browser-sample progress ratio, motion data state, background transforms, and document overflow.
- [ ] Check wordmark bounds at 390px and 1440px.
- [ ] Stop dev server, run production build, and restart dev server.
