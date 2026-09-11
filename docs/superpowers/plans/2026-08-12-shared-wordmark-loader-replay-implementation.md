pử# Shared Wordmark and Loader Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the header logo to the cinematic `EDOLAS` + `SG` wordmark and visibly run the loader progress bar on every full document load or refresh.

**Architecture:** A focused `BrandWordmark` component owns the shared text lockup while CSS variants size it for header and loader contexts. The loader state machine starts directly in `playing`, removes session-storage gating, and mounts the Motion fill at `scaleX(0)` before animating to `scaleX(1)`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Framer Motion 11, Tailwind CSS, Node test runner.

## Global Constraints

- Preserve the approved electric sapphire palette and pixel typography.
- Replay only on full document loads or refreshes, not App Router client navigation.
- Progress must reach 100%, hold for 140ms, and only then begin the shutter exit.
- Use only compositor-friendly `transform` and `opacity` animation.
- Preserve skip behavior, live status, focus styles, and reduced-motion timing.
- Add no image asset, font dependency, or animation library.
- This workspace has no `.git` directory, so commit steps are not applicable.

## File Structure

- Create `components/brand-wordmark.tsx`: shared semantic text structure for header and loader variants.
- Modify `components/site-header.tsx`: replace the sword tile and duplicate logo copy with `BrandWordmark`.
- Modify `components/motion/cinematic-loader.tsx`: use shared wordmark and start progress deterministically on every mount.
- Modify `lib/cinematic-loader.ts`: remove session persistence and simplify the stage model.
- Modify `app/globals.css`: add shared wordmark variants and remove obsolete logo/scanner selectors.
- Modify `tests/cinematic-loader.test.mts`: cover the simplified state machine and progress sequence.
- Create `tests/brand-wordmark.test.mts`: verify both surfaces consume the shared wordmark.

---

### Task 1: Deterministic Loader Replay

**Files:**
- Modify: `tests/cinematic-loader.test.mts`
- Modify: `lib/cinematic-loader.ts`
- Modify: `components/motion/cinematic-loader.tsx`

**Interfaces:**
- Produces: `CinematicStage = "playing" | "exiting" | "complete"`.
- Produces: `getInitialCinematicStage(): CinematicStage`, returning `"playing"`.
- Produces: `advanceCinematicStage(stage, event)` without storage or `start` handling.
- Consumes: `getCinematicDurations()` and `getCinematicProgressMode()`.

- [ ] **Step 1: Replace session tests with the replay contract**

Remove imports and tests for `CINEMATIC_SESSION_KEY`, `CinematicStorage`, `shouldPlayCinematic`, and `markCinematicComplete`. Assert that `playing` maps to `running`, that only `progress-complete` advances to `exiting`, and that the settle/exit durations remain unchanged.

```ts
test("loader starts with a running progress bar on every mount", () => {
  const initialStage = getInitialCinematicStage();
  assert.equal(initialStage, "playing");
  assert.equal(getCinematicProgressMode(initialStage), "running");
});

test("cinematic loader opens only after progress completes", () => {
  assert.equal(advanceCinematicStage("playing", "progress-complete"), "exiting");
  assert.equal(advanceCinematicStage("exiting", "exit-complete"), "complete");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --experimental-strip-types --test tests/cinematic-loader.test.mts`

Expected: FAIL because the existing model still includes session gating and checking-stage assumptions.

- [ ] **Step 3: Simplify the pure loader model**

Use the exact stage and event model below and delete all storage helpers because no production caller remains.

```ts
export type CinematicStage = "playing" | "exiting" | "complete";
export type CinematicEvent = "progress-complete" | "exit-complete" | "skip";

export function getInitialCinematicStage(): CinematicStage {
  return "playing";
}

export function advanceCinematicStage(stage: CinematicStage, event: CinematicEvent): CinematicStage {
  if (event === "skip") return "complete";
  if (stage === "playing" && event === "progress-complete") return "exiting";
  if (stage === "exiting" && event === "exit-complete") return "complete";
  return stage;
}
```

- [ ] **Step 4: Start the component directly in playing**

Remove the session-storage effect, storage ref, and completion writes. Initialize with `useState<CinematicStage>(getInitialCinematicStage)`. Mount the fill with `initial={{ scaleX: 0 }}` and `animate={{ scaleX: 1 }}` so Framer Motion cannot treat 100% as the initial frame.

```tsx
const [stage, setStage] = useState<CinematicStage>(getInitialCinematicStage);

<motion.span
  className={`cinematic-loader-progress-fill${progressMode === "complete" ? " is-complete" : ""}`}
  initial={{ scaleX: 0 }}
  animate={{ scaleX: 1 }}
  transition={{ duration: durations.play / 1000, ease: "linear" }}
  onAnimationComplete={stage === "playing" ? beginExit : undefined}
/>
```

- [ ] **Step 5: Run the focused test**

Run: `node --experimental-strip-types --test tests/cinematic-loader.test.mts`

Expected: all cinematic loader tests PASS.

---

### Task 2: Shared Header and Loader Wordmark

**Files:**
- Create: `components/brand-wordmark.tsx`
- Create: `tests/brand-wordmark.test.mts`
- Modify: `components/site-header.tsx`
- Modify: `components/motion/cinematic-loader.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `BrandWordmark({ variant }: { variant: "header" | "loader" })`.
- Consumes: existing `--font-pixel`, `--font-inter`, `--color-text`, and `--color-primary` tokens.

- [ ] **Step 1: Write the shared-consumer test**

Read the three component files as UTF-8 and assert both surfaces render the shared component while the header no longer imports `Sword`.

```ts
test("header and loader share the EDOLAS SG wordmark", async () => {
  assert.match(headerSource, /<BrandWordmark variant="header" \/>/);
  assert.match(loaderSource, /<BrandWordmark variant="loader" \/>/);
  assert.doesNotMatch(headerSource, /\bSword\b/);
  assert.match(wordmarkSource, /EDOLAS/);
  assert.match(wordmarkSource, /SG/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types --test tests/brand-wordmark.test.mts`

Expected: FAIL because `components/brand-wordmark.tsx` does not exist.

- [ ] **Step 3: Create the focused wordmark component**

```tsx
type BrandWordmarkProps = {
  variant: "header" | "loader";
};

export function BrandWordmark({ variant }: BrandWordmarkProps) {
  return (
    <span className={`brand-wordmark brand-wordmark--${variant}`} aria-hidden="true">
      <span className="brand-wordmark-kicker">MINECRAFT NETWORK</span>
      <span className="brand-wordmark-name">EDOLAS<span>SG</span></span>
    </span>
  );
}
```

- [ ] **Step 4: Replace duplicate logo markup**

Import `BrandWordmark` in the header and loader. Remove `Sword` from the Lucide import, remove the sword tile and old copy block, and retain the header link's existing accessible label.

- [ ] **Step 5: Add shared CSS variants**

Define `.brand-wordmark`, `.brand-wordmark-kicker`, and `.brand-wordmark-name` once. Use `.brand-wordmark--header` for compact size and hover glow; use `.brand-wordmark--loader` for the current large centered size. Remove obsolete `.pixel-logo`, `.site-logo-icon`, `.site-logo-copy`, `.cinematic-loader-kicker`, and `.cinematic-loader-wordmark` selectors after all callers are migrated.

- [ ] **Step 6: Run the shared-consumer and palette tests**

Run: `node --experimental-strip-types --test tests/brand-wordmark.test.mts tests/color-palette.test.mts`

Expected: both files PASS and no retired colors are introduced.

---

### Task 3: Runtime and Regression Verification

**Files:**
- Verify: `components/brand-wordmark.tsx`
- Verify: `components/site-header.tsx`
- Verify: `components/motion/cinematic-loader.tsx`
- Verify: `lib/cinematic-loader.ts`
- Verify: `app/globals.css`

**Interfaces:**
- Consumes: the completed loader model and shared wordmark from Tasks 1 and 2.
- Produces: verified desktop, mobile, reduced-motion, and production behavior.

- [ ] **Step 1: Run static verification**

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm run lint`

Expected: exit code 0 with zero warnings.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Inspect progress in a fresh browser document**

Use Chrome DevTools Protocol to sample `.cinematic-loader-progress-fill` at multiple timestamps. Confirm computed `scaleX` begins at 0, increases during `data-stage="playing"`, reaches 1, then stage changes to `exiting` and finally `complete`.

- [ ] **Step 4: Verify replay and navigation boundaries**

Refresh the document and confirm the same 0-to-1 sequence occurs again. Navigate through an internal Next.js link and confirm the root loader does not remount.

- [ ] **Step 5: Verify responsive wordmark**

Check header at 390px and 1440px viewport widths. Confirm the wordmark remains inside the 80px header, does not overlap the mobile menu or desktop controls, and keeps `SG` purple.

- [ ] **Step 6: Run the production build without a concurrent dev server**

Run: `npm run build`

Expected: optimized build completes and all routes are generated successfully.
