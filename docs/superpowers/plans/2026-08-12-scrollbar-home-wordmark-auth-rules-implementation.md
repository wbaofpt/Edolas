# Scrollbar, Home Wordmark, and Auth Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a transient custom scrollbar, a stronger Home wordmark, strict new-account usernames, verified unique emails, and editor-clean tests.

**Architecture:** A pure scroll-metrics helper supports a small root client indicator; the existing shared wordmark receives a Home-only variant; auth validation uses one exported username predicate at HTTP and service boundaries while MySQL remains the uniqueness authority.

**Tech Stack:** Next.js 14, React 18, TypeScript, Framer Motion, CSS, MySQL, Node test runner.

## Task 1: Custom scroll indicator

- [ ] Add failing geometry and source integration tests.
- [ ] Create `lib/scroll-indicator.ts` and `components/custom-scrollbar.tsx`.
- [ ] Mount the indicator in `app/layout.tsx`.
- [ ] Hide native scrollbars and style the transient rail in `app/globals.css`.
- [ ] Run focused tests.

## Task 2: Home wordmark

- [ ] Add a failing shared-wordmark Home assertion.
- [ ] Extend `BrandWordmark` with `hero`.
- [ ] Replace duplicate Home title markup while retaining accessible `h1` semantics.
- [ ] Add Home-only structure and responsive styles.
- [ ] Run wordmark and palette tests.

## Task 3: Registration invariants and test diagnostics

- [ ] Add failing ASCII-alphanumeric username tests and duplicate-email service test.
- [ ] Centralize and apply the username rule in parser and service.
- [ ] Add matching HTML input constraints.
- [ ] Switch the two reported tests to named Node imports.
- [ ] Re-run live auth audit and focused auth tests.

## Task 4: End-to-end verification

- [ ] Run TypeScript, ESLint, and all tests.
- [ ] Browser-check scrollbar visibility and Home bounds at 390px and 1440px.
- [ ] Stop dev server, run production build, and restart dev server.
