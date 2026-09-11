# Cinematic Session Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cinematic EdolasSG portal opening that plays once per browser tab session and reveals the whole website after 1,800ms or immediately when skipped.

**Architecture:** A pure storage helper owns the session key and fail-open behavior. A root-mounted client component owns the `checking`, `playing`, `exiting`, and `complete` stages, while CSS-only visual layers provide the Minecraft realm composition using compositor-friendly motion.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Framer Motion 11, Tailwind CSS, Node test runner.

## Global Constraints

- Play once per browser tab session and begin the normal completion transition after exactly 1,800ms.
- Provide a visible `Bỏ qua` button from the beginning of the playing stage.
- Use `sessionStorage`; storage failures must not block access to the website.
- Respect `prefers-reduced-motion` with a short static frame and near-immediate fade.
- Animate only `transform` and `opacity` on large surfaces; do not animate blur, masks, or layout dimensions.
- Introduce no new runtime dependency, bitmap, or video asset.
- Support 375px, 768px, 1024px, and 1440px widths without horizontal overflow.
- The workspace has no `.git` directory, so verification checkpoints replace commit steps.

---

### Task 1: Session Playback Preference

**Files:**
- Create: `lib/cinematic-loader.ts`
- Create: `tests/cinematic-loader.test.mts`

**Interfaces:**
- Consumes: a storage object implementing `getItem(key)` and `setItem(key, value)`.
- Produces: `CINEMATIC_SESSION_KEY`, `shouldPlayCinematic(storage)`, and `markCinematicComplete(storage)`.

- [ ] **Step 1: Write the failing helper tests**

Create `tests/cinematic-loader.test.mts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  CINEMATIC_SESSION_KEY,
  markCinematicComplete,
  shouldPlayCinematic
} from "../lib/cinematic-loader.ts";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem(key: string) {
      assert.equal(key, CINEMATIC_SESSION_KEY);
      return value;
    },
    setItem(key: string, nextValue: string) {
      assert.equal(key, CINEMATIC_SESSION_KEY);
      value = nextValue;
    }
  };
}

test("cinematic loader plays for a fresh tab session", () => {
  assert.equal(shouldPlayCinematic(createStorage()), true);
});

test("cinematic loader stays hidden after completion in the same session", () => {
  const storage = createStorage();
  markCinematicComplete(storage);
  assert.equal(shouldPlayCinematic(storage), false);
});

test("cinematic loader fails open when session storage throws", () => {
  const storage = {
    getItem() {
      throw new Error("storage disabled");
    },
    setItem() {
      throw new Error("storage disabled");
    }
  };

  assert.equal(shouldPlayCinematic(storage), true);
  assert.doesNotThrow(() => markCinematicComplete(storage));
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
node --experimental-strip-types --test tests/cinematic-loader.test.mts
```

Expected: FAIL because `lib/cinematic-loader.ts` does not exist.

- [ ] **Step 3: Implement the minimal storage helper**

Create `lib/cinematic-loader.ts`:

```ts
export const CINEMATIC_SESSION_KEY = "edolas_cinematic_complete";

export type CinematicStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function shouldPlayCinematic(storage: CinematicStorage) {
  try {
    return storage.getItem(CINEMATIC_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markCinematicComplete(storage: CinematicStorage) {
  try {
    storage.setItem(CINEMATIC_SESSION_KEY, "1");
  } catch {
    // Storage availability must never block the website.
  }
}
```

- [ ] **Step 4: Run the helper tests and verify GREEN**

Run:

```powershell
node --experimental-strip-types --test tests/cinematic-loader.test.mts
```

Expected: 3 tests pass with no warnings.

- [ ] **Step 5: Record the checkpoint**

Run `npm test` and confirm the existing suite remains green. No commit command is possible until this workspace has `.git` metadata.

---

### Task 2: Root-Mounted Cinematic Loader

**Files:**
- Create: `components/motion/cinematic-loader.tsx`
- Create: `tests/cinematic-loader-ui.test.mts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `shouldPlayCinematic(window.sessionStorage)` and `markCinematicComplete(window.sessionStorage)` from Task 1.
- Produces: `CinematicLoader(): JSX.Element | null`, mounted once by `RootLayout` before the site shell.

- [ ] **Step 1: Write the failing integration source test**

Create `tests/cinematic-loader-ui.test.mts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("root layout mounts the cinematic session loader", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /import \{ CinematicLoader \}/);
  assert.match(layout, /<CinematicLoader \/>/);
});

test("cinematic loader exposes skip, status, and reduced-motion behavior", async () => {
  const source = await readFile(new URL("../components/motion/cinematic-loader.tsx", import.meta.url), "utf8");
  assert.match(source, /useReducedMotion/);
  assert.match(source, /role="status"/);
  assert.match(source, /Bỏ qua/);
  assert.match(source, /1_800/);
  assert.match(source, /sessionStorage/);
});
```

- [ ] **Step 2: Run the UI tests and verify RED**

Run:

```powershell
node --experimental-strip-types --test tests/cinematic-loader-ui.test.mts
```

Expected: FAIL because the component does not exist and the root layout does not mount it.

- [ ] **Step 3: Implement the loader state machine**

Create `components/motion/cinematic-loader.tsx` as a client component with:

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { markCinematicComplete, shouldPlayCinematic } from "@/lib/cinematic-loader";

type LoaderStage = "checking" | "playing" | "exiting" | "complete";
const PLAY_DURATION_MS = 1_800;
const EXIT_DURATION_MS = 620;

export function CinematicLoader() {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState<LoaderStage>("checking");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {}

    if (storage && !shouldPlayCinematic(storage)) {
      setStage("complete");
      return;
    }

    setStage("playing");
    const playTimer = window.setTimeout(() => {
      if (storage) markCinematicComplete(storage);
      setStage("exiting");
      const exitTimer = window.setTimeout(
        () => setStage("complete"),
        reducedMotion ? 80 : EXIT_DURATION_MS
      );
      timers.current.push(exitTimer);
    }, reducedMotion ? 180 : PLAY_DURATION_MS);
    timers.current.push(playTimer);

    return () => timers.current.forEach(window.clearTimeout);
  }, [reducedMotion]);

  useEffect(() => {
    if (stage === "complete") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [stage]);

  function skip() {
    timers.current.forEach(window.clearTimeout);
    try {
      markCinematicComplete(window.sessionStorage);
    } catch {
      // Access to the site must not depend on browser storage.
    }
    setStage("complete");
  }

  return (
    <AnimatePresence>
      {stage !== "complete" ? (
        <motion.div
          className="cinematic-loader"
          data-stage={stage}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="cinematic-loader-sky" aria-hidden="true" />
          <div className="cinematic-loader-stars" aria-hidden="true" />
          <div className="cinematic-loader-terrain cinematic-loader-terrain-far" aria-hidden="true" />
          <div className="cinematic-loader-terrain cinematic-loader-terrain-near" aria-hidden="true" />
          <div className="cinematic-loader-motes" aria-hidden="true">
            {Array.from({ length: reducedMotion ? 0 : 12 }, (_, index) => <span key={index} />)}
          </div>
          <div className="cinematic-loader-brand">
            <span className="cinematic-loader-kicker">MINECRAFT NETWORK</span>
            <strong className="cinematic-loader-wordmark">EDOLAS<span>SG</span></strong>
            <div className="cinematic-loader-progress" aria-hidden="true"><span /></div>
          </div>
          <p role="status" aria-live="polite" className="cinematic-loader-status">Đang mở cổng Edolas</p>
          <button
            type="button"
            onClick={skip}
            disabled={stage === "checking"}
            className="cinematic-loader-skip focus-ring"
          >
            Bỏ qua
          </button>
          <motion.div
            className="cinematic-loader-shutter cinematic-loader-shutter-left"
            animate={{ x: stage === "exiting" ? "-100%" : "0%", opacity: stage === "exiting" ? 0 : 1 }}
            aria-hidden="true"
          />
          <motion.div
            className="cinematic-loader-shutter cinematic-loader-shutter-right"
            animate={{ x: stage === "exiting" ? "100%" : "0%", opacity: stage === "exiting" ? 0 : 1 }}
            aria-hidden="true"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

During implementation, retain the exact state names, timing constants, storage failure behavior, and semantic layer markup above.

- [ ] **Step 4: Add the complete visual layer markup**

Confirm the overlay markup contains these layers and bindings:

```tsx
<div className="cinematic-loader-sky" aria-hidden="true" />
<div className="cinematic-loader-stars" aria-hidden="true" />
<div className="cinematic-loader-terrain cinematic-loader-terrain-far" aria-hidden="true" />
<div className="cinematic-loader-terrain cinematic-loader-terrain-near" aria-hidden="true" />
<div className="cinematic-loader-motes" aria-hidden="true">
  {Array.from({ length: reducedMotion ? 0 : 12 }, (_, index) => <span key={index} />)}
</div>
<div className="cinematic-loader-brand">
  <span className="cinematic-loader-kicker">MINECRAFT NETWORK</span>
  <strong className="cinematic-loader-wordmark">EDOLAS<span>SG</span></strong>
  <div className="cinematic-loader-progress" aria-hidden="true"><span /></div>
</div>
<p role="status" aria-live="polite" className="cinematic-loader-status">Đang mở cổng Edolas</p>
<button type="button" onClick={skip} className="cinematic-loader-skip focus-ring">Bỏ qua</button>
<motion.div className="cinematic-loader-shutter cinematic-loader-shutter-left" aria-hidden="true" />
<motion.div className="cinematic-loader-shutter cinematic-loader-shutter-right" aria-hidden="true" />
```

The skip button stays mounted during `checking` and `playing`; disable it during `checking` to avoid an action before storage initialization. The two shutters receive Framer Motion `animate` values based on `stage === "exiting"`, translating left/right and fading without changing width.

- [ ] **Step 5: Mount the loader once in the root layout**

Modify `app/layout.tsx`:

```tsx
import { CinematicLoader } from "@/components/motion/cinematic-loader";

// Inside <body>, before the persistent website wrapper:
<CinematicLoader />
```

- [ ] **Step 6: Run the UI tests and verify GREEN**

Run:

```powershell
node --experimental-strip-types --test tests/cinematic-loader-ui.test.mts
```

Expected: 2 tests pass.

- [ ] **Step 7: Record the checkpoint**

Run `npm test` and `npx tsc --noEmit`. Both must pass before styling begins.

---

### Task 3: Cinematic Visual System and Delivery Verification

**Files:**
- Modify: `app/globals.css`
- Modify: `components/motion/cinematic-loader.tsx` only if the CSS review exposes a missing class or reduced-motion branch.

**Interfaces:**
- Consumes: the exact class names rendered by `CinematicLoader` in Task 2.
- Produces: responsive terrain, particle, wordmark, progress, portal shutter, skip, and status styling with reduced-motion overrides.

- [ ] **Step 1: Add the fixed overlay and composition styles**

Append a dedicated `/* Cinematic session loader */` section to `app/globals.css` with these constraints:

```css
.cinematic-loader {
  position: fixed;
  inset: 0;
  z-index: 60;
  isolation: isolate;
  overflow: hidden;
  background: #040806;
  color: #f5faF1;
}

.cinematic-loader-brand {
  position: absolute;
  inset: 50% auto auto 50%;
  z-index: 2;
  width: min(34rem, calc(100% - 2rem));
  transform: translate3d(-50%, -50%, 0);
  text-align: center;
}

.cinematic-loader-skip {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  z-index: 4;
  min-width: 5.5rem;
  min-height: 2.75rem;
}

.cinematic-loader-status {
  position: absolute;
  right: 1rem;
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: 1rem;
  z-index: 2;
  text-align: center;
}
```

Build terrain from clipped polygonal pseudo-elements or stepped `box-shadow` silhouettes, but keep them static. The sky may use static radial/linear gradients already established by the project.

- [ ] **Step 2: Add compositor-only motion**

Create keyframes whose declarations contain only `transform` and `opacity`:

```css
@keyframes cinematic-brand-enter {
  from { opacity: 0; transform: translate3d(-50%, -44%, 0) scale(0.96); }
  to { opacity: 1; transform: translate3d(-50%, -50%, 0) scale(1); }
}

@keyframes cinematic-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes cinematic-mote-rise {
  0% { opacity: 0; transform: translate3d(0, 5rem, 0); }
  20% { opacity: 0.8; }
  100% { opacity: 0; transform: translate3d(var(--mote-drift), -70vh, 0); }
}
```

Set the progress duration to `1800ms`. Use only 12 mote spans on desktop and hide every even mote below 640px. Do not add `filter`, animated `box-shadow`, animated background, or permanent `will-change`.

- [ ] **Step 3: Add responsive and reduced-motion rules**

Add mobile rules at `max-width: 640px` that reduce terrain height and wordmark size, and reduced-motion rules:

```css
@media (prefers-reduced-motion: reduce) {
  .cinematic-loader-motes,
  .cinematic-loader-terrain-far {
    display: none;
  }

  .cinematic-loader-brand,
  .cinematic-loader-progress > span {
    animation: none !important;
  }
}
```

The existing global reduced-motion rule remains in force; these selectors additionally remove decorative layers rather than merely shortening them.

- [ ] **Step 4: Audit accessibility and motion performance**

Confirm in source:

- `role="status"` and `aria-live="polite"` are on non-interactive status text.
- The skip button uses a native `<button>`, is at least 44px tall, and has `focus-ring`.
- All decorative layers are `aria-hidden="true"`.
- Large surfaces animate only `transform` and `opacity`.
- No animation reads `scrollY`, layout boxes, or starts an unbounded JavaScript loop.
- Body overflow is restored on skip, normal completion, and component unmount.

- [ ] **Step 5: Run the complete automated verification**

Run in order:

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all tests pass, TypeScript emits no errors, ESLint emits no warnings, and Next.js production build completes successfully.

- [ ] **Step 6: Inspect responsive output**

Start the local server and inspect widths 375px, 768px, 1024px, and 1440px. Verify the first load shows the loader, the skip control reveals the site immediately, a refresh in the same tab does not replay it, and clearing session storage allows it to play again.

- [ ] **Step 7: Record the final checkpoint**

Capture the verification results in the delivery response. Git commit is unavailable because the workspace has no `.git` metadata.
