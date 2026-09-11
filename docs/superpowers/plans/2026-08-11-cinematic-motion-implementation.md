# EdolasSG Cinematic Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cinematic, performant motion system across EdolasSG, with a high-impact homepage and restrained motion on content and authentication pages.

**Architecture:** Keep pages as Server Components and introduce focused client boundaries for viewport reveals, pointer tilt, ambient world layers, and route entrances. Framer Motion handles component transitions and interaction; CSS handles decorative compositor-only loops. Existing content, authentication requests, and routing behavior remain unchanged.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS 3, Framer Motion 11, CSS keyframes, Lucide React.

## Global Constraints

- Keep the existing Next.js, Tailwind, CSS, and Framer Motion stack; do not add an animation library.
- Prefer `transform` and `opacity`; do not continuously animate layout or large filters.
- Do not poll scroll position or run an unbounded `requestAnimationFrame` loop.
- Disable pointer parallax and tilt on touch devices and under `prefers-reduced-motion`.
- Motion must never delay navigation or hide focus indicators.
- Preserve all content, authentication behavior, API calls, and database behavior.
- The repository has no `.git` directory, so commit steps are intentionally omitted.

---

### Task 1: Shared Motion Primitives

**Files:**
- Create: `components/motion/reveal.tsx`
- Create: `components/motion/tilt-card.tsx`
- Modify: `components/animated-card.tsx`
- Modify: `components/section-heading.tsx`

**Interfaces:**
- Produces: `Reveal`, accepting `children`, `className`, `delay`, `direction`, and `amount`.
- Produces: `StaggerGroup`, accepting `children`, `className`, and `stagger`.
- Produces: `StaggerItem`, accepting `children` and `className`.
- Produces: `TiltCard`, accepting `children`, `className`, and `intensity`.
- Preserves: the current `AnimatedCard` public props.

- [ ] **Step 1: Create viewport reveal and stagger primitives**

Use `useReducedMotion()` and variants whose animated properties are limited to opacity and transform:

```tsx
"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "left" | "right" | "none";

export function Reveal({ children, className = "", delay = 0, direction = "up", amount = 0.2 }: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  amount?: number;
}) {
  const reduced = useReducedMotion();
  const offset = reduced ? 0 : 28;
  const initial = direction === "left" ? { x: -offset } : direction === "right" ? { x: offset } : direction === "up" ? { y: offset } : {};
  return <motion.div initial={{ opacity: reduced ? 1 : 0, ...initial }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true, amount }} transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>;
}

const group: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const item: Variants = { hidden: { opacity: 0, y: 20 }, shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
```

- [ ] **Step 2: Create a bounded pointer tilt component**

Use `useMotionValue`, `useSpring`, and pointer media queries. Reset values on pointer leave. The component must not measure layout per frame; calculate pointer position only during pointer events and cap rotation to `intensity`, default `4` degrees.

- [ ] **Step 3: Rebase existing cards and headings on the primitives**

Keep `AnimatedCard` callable exactly as it is, but delegate its reveal to `Reveal`. Wrap the internals of `SectionHeading` in `Reveal` so all existing pages gain a consistent one-shot heading entrance without becoming client components themselves.

- [ ] **Step 4: Verify the shared layer**

Run: `npm run lint`

Expected: exit code `0`, with no React hook, TypeScript, or accessibility warnings.

---

### Task 2: Ambient World and Route Entrance

**Files:**
- Create: `components/motion/ambient-world.tsx`
- Create: `app/template.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `AmbientWorld({ intensity?: "hero" | "page" | "auth" })` decorative component.
- Produces: App Router template that animates route content entrance without intercepting links.

- [ ] **Step 1: Implement ambient world markup**

Render an `aria-hidden="true"` and `pointer-events-none` container with separate stars, drifting pixel motes, mist bands, and glow layers. Use deterministic static elements instead of runtime randomness so server/client markup remains stable.

- [ ] **Step 2: Add compositor-only ambient CSS**

Add keyframes for slow `translate3d`, scale, and opacity. Provide intensity classes so hero has the richest scene, page backgrounds have fewer particles, and auth has only mist and glow. Add mobile selectors that hide alternating motes.

```css
@media (prefers-reduced-motion: reduce) {
  .ambient-world [data-motion-layer] {
    animation: none !important;
    transform: none !important;
  }
}
```

- [ ] **Step 3: Add a route entrance template**

Create `app/template.tsx` as a client component using `useReducedMotion()`. Animate a short portal veil from opacity `0.32` to `0` and scale route content from `0.995` to `1`; set `pointer-events: none` on the veil so navigation is never blocked.

- [ ] **Step 4: Mount the shared page ambience**

Mount `AmbientWorld intensity="page"` once in the layout behind route content. Keep the header at its current z-index and ensure the ambient container cannot create horizontal overflow.

- [ ] **Step 5: Verify build boundaries**

Run: `npm run build`

Expected: exit code `0`; all existing routes are statically generated or compiled as before, and no browser-only API is accessed from a Server Component.

---

### Task 3: Cinematic Homepage Hero and Content Choreography

**Files:**
- Create: `components/cinematic-hero.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `CinematicHero` with no props; it preserves the current hero copy, links, image, server IP, and anchors.
- Consumes: `AmbientWorld`, `Reveal`, `StaggerGroup`, `StaggerItem`, and `TiltCard`.

- [ ] **Step 1: Extract the hero into a focused client component**

Move the existing hero markup into `CinematicHero`. Use Framer Motion variants to reveal status, season, title, description, actions, and IP in sequence. Preserve `id="home"`, `href="#about"`, all accessible labels, and the existing `next/image` priority behavior.

- [ ] **Step 2: Add bounded hero parallax**

Use motion values updated from `onPointerMove` on the hero only. Apply separate transform multipliers to background, ambient scene, glow, and foreground content. Check `useReducedMotion()` and `(pointer: fine)` before applying values; reset to zero on pointer leave.

- [ ] **Step 3: Add trailer-style hero treatments**

Add a one-shot title light sweep, pixel-edge glow, vignette breathing, and scroll cue pulse. Keep continuous animation on opacity/transform only. The image filter remains static.

- [ ] **Step 4: Choreograph homepage sections**

Wrap major grids and row collections in stagger primitives. Wrap large `mystic-card` surfaces with `TiltCard`, limited to desktop pointers. Add a one-shot `mode-line` energy sweep and stronger final CTA portal class when each enters the viewport.

- [ ] **Step 5: Verify the homepage**

Run: `npm run lint`

Expected: exit code `0`.

Run: `npm run build`

Expected: exit code `0`; `/` compiles without hydration errors.

---

### Task 4: Header and Mobile Navigation Motion

**Files:**
- Modify: `components/site-header.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Preserves: all current links, scroll threshold, Discord URL, menu state, ARIA attributes, and keyboard behavior.

- [ ] **Step 1: Animate mobile menu presence**

Use `AnimatePresence` and a `motion.div` for the menu container. Animate links with staggered opacity and horizontal translation. Reduced motion uses zero duration and no offset.

- [ ] **Step 2: Add navigation energy indicators**

Add a pseudo-element to desktop navigation links that grows via `scaleX` on hover and focus-visible. Animate the logo icon with a small rotation/translation on link hover without scaling the clickable box.

- [ ] **Step 3: Verify navigation accessibility**

Run: `npm run lint`

Expected: exit code `0`, including no ARIA or keyboard-accessibility warnings.

Manually verify: tab focus reaches every desktop/mobile link, Escape behavior remains unchanged because it was not part of the existing interface, and the menu button retains `aria-expanded` and `aria-controls`.

---

### Task 5: Content Page Motion

**Files:**
- Create: `components/motion/cinematic-page.tsx`
- Modify: `app/game-modes/page.tsx`
- Modify: `app/wiki/page.tsx`
- Modify: `app/forum/page.tsx`
- Modify: `app/discipline/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `CinematicPage({ children, className? })`, a semantic page shell with restrained intro atmosphere.
- Consumes: `Reveal`, `StaggerGroup`, `StaggerItem`, and `TiltCard`.

- [ ] **Step 1: Build the cinematic page shell**

Render a relative overflow-safe wrapper, a decorative horizon glow, and the page content. The shell must accept Server Component children and add no route-specific business logic.

- [ ] **Step 2: Apply page intro and list choreography**

Wrap the back link in `Reveal direction="left"`, keep `SectionHeading` shared, and wrap each page's main cards or rows in `StaggerGroup`/`StaggerItem`. Use `TiltCard` only on card grids, not long rule rows or dense forum rows.

- [ ] **Step 3: Normalize dark mystic surface styles**

Replace light-only utility combinations such as `bg-white` inside these pages with existing mystic surface classes where needed for visual consistency. Preserve wording, element semantics, and responsive grid structure.

- [ ] **Step 4: Verify every content route**

Run: `npm run build`

Expected: exit code `0`; `/game-modes`, `/wiki`, `/forum`, and `/discipline` all appear in the route output.

---

### Task 6: Authentication Motion and Feedback

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `components/auth-form.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Preserves: `AuthForm({ mode: "login" | "register" })` and all request/submit behavior.
- Consumes: `AmbientWorld` and Framer Motion presence transitions.

- [ ] **Step 1: Add restrained authentication ambience**

Mount `AmbientWorld intensity="auth"` in login and register pages. Add portal ring layers behind the panel with pointer events disabled.

- [ ] **Step 2: Animate panel and form status**

Wrap the auth panel in a one-shot opacity/translate/scale entrance. Use `AnimatePresence` for error, success, and email-sent feedback, animating opacity and translate only so input positions do not move during active typing beyond the existing message insertion behavior.

- [ ] **Step 3: Preserve form usability under motion preferences**

Use `useReducedMotion()` to set entrance/status durations and offsets to zero. Do not add tilt, pointer-follow, or continuous blur around the form.

- [ ] **Step 4: Verify auth behavior**

Run: `npm run lint`

Expected: exit code `0`.

Run: `npm run build`

Expected: exit code `0`; `/login`, `/register`, and all auth API routes compile.

---

### Task 7: Final Performance and Accessibility Pass

**Files:**
- Modify: `app/globals.css`
- Modify only if a violation is found: files changed in Tasks 1-6.

**Interfaces:**
- No new public interfaces.

- [ ] **Step 1: Audit animation properties**

Search all changed files for animation of `width`, `height`, positional layout properties, inherited CSS variables, and large animated filters. Replace any violation with transform/opacity or remove it.

Run: `rg -n "transition:.*(width|height|top|left)|animation:.*blur|scrollY|scrollTop|addEventListener\(['\"]scroll" app components`

Expected: only the pre-existing passive header threshold listener may match; no animation uses scroll polling or continuous layout properties.

- [ ] **Step 2: Audit reduced motion and touch fallbacks**

Confirm every continuous CSS keyframe is disabled by the reduced-motion block, every Framer component uses `useReducedMotion`, and pointer effects are gated by `(pointer: fine)`.

- [ ] **Step 3: Run final static verification**

Run: `npm run lint`

Expected: exit code `0`.

Run: `npm run build`

Expected: exit code `0` and all pages/API routes compile.

- [ ] **Step 4: Run responsive smoke checks**

Start with `npm run dev`, inspect `/`, `/game-modes`, `/wiki`, `/forum`, `/discipline`, `/login`, and `/register` at widths 375px, 768px, 1024px, and 1440px. Confirm no horizontal overflow, content remains readable, controls remain clickable, and mobile has no tilt/parallax.
