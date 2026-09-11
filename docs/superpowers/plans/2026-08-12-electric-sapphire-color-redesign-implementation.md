# Electric Sapphire Color Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the forest-green brand system across every route with the approved electric-purple, sapphire, cyan, and blue-black palette without changing layout or behavior.

**Architecture:** Canonical CSS custom properties establish the seven approved roles. Shared components, page utilities, auth surfaces, and the cinematic loader are migrated in isolated checkpoints, with a palette contract test preventing legacy greens from returning.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, CSS custom properties, Node test runner.

## Global Constraints

- Background: `#080B18`.
- Primary: `#8B5CF6`.
- Secondary: `#38BDF8`.
- Accent: `#67E8F9`.
- Highlight: `#E0F2FE`.
- Primary text: `#F8FAFC`.
- Secondary text: `#94A3B8`.
- Preserve red for errors/destructive actions and amber for warnings/severity.
- Preserve layout, copy, authentication, routes, loader timing, and reduced-motion behavior.
- Add no dependency, image, or video asset.
- Workspace has no `.git`; test/build checkpoints replace commit steps.

---

### Task 1: Palette Contract and Canonical Tokens

**Files:**
- Create: `tests/color-palette.test.mts`
- Modify: `app/globals.css:1-75`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces CSS properties `--color-background`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-highlight`, `--color-text`, and `--color-text-muted`.
- Existing Tailwind colors continue consuming HSL variables such as `--background`, `--primary`, and `--secondary`.

- [ ] **Step 1: Write the failing palette contract test**

Create a test that reads `app/globals.css`, extracts `:root`, and asserts these exact declarations:

```ts
const expected = {
  "--color-background": "#080b18",
  "--color-primary": "#8b5cf6",
  "--color-secondary": "#38bdf8",
  "--color-accent": "#67e8f9",
  "--color-highlight": "#e0f2fe",
  "--color-text": "#f8fafc",
  "--color-text-muted": "#94a3b8"
};
```

Also assert that active source under `app/` and `components/` no longer contains these branded legacy literals after migration:

```ts
const legacyColors = [
  "#65a844", "#75bb50", "#4c8a37", "#8fd163", "#91cf68",
  "#9cda72", "#9ee16e", "#a5e878", "#a7e17d", "#b5f489"
];
```

- [ ] **Step 2: Run RED**

```powershell
node --experimental-strip-types --test tests/color-palette.test.mts
```

Expected: FAIL because canonical token declarations are absent and legacy greens remain.

- [ ] **Step 3: Add canonical root tokens**

Add the seven hexadecimal variables and update HSL compatibility values:

```css
:root {
  --color-background: #080b18;
  --color-primary: #8b5cf6;
  --color-secondary: #38bdf8;
  --color-accent: #67e8f9;
  --color-highlight: #e0f2fe;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --background: 229 50% 6%;
  --foreground: 210 40% 98%;
  --primary: 258 90% 66%;
  --secondary: 198 93% 60%;
  --accent: 187 92% 69%;
  --ring: 187 92% 69%;
}
```

Update `body`, selection, focus rings, and root layout background to consume the new roles.

- [ ] **Step 4: Run the contract test**

Expected: token assertions pass; legacy scan remains red until Tasks 2-5 complete.

---

### Task 2: Shared Shell, Header, and Page Components

**Files:**
- Modify: `components/site-header.tsx`
- Modify: `components/cinematic-hero.tsx`
- Modify: `components/section-heading.tsx`
- Modify: `components/animated-card.tsx` only if it contains branded color literals.
- Modify: `app/page.tsx`
- Modify: content route components under `app/game-modes`, `app/forum`, `app/wiki`, and `app/discipline` only where branded literals appear.

**Mapping:**
- Primary CTA, logo tile, active account: primary purple.
- Links and informational icon accents: sapphire.
- Energy, online state, focus, and transient highlights: cyan.
- Headings: highlight/primary text.
- Supporting copy: blue gray.

- [ ] **Step 1: Replace JSX color literals with semantic utilities**

Use approved values such as `bg-[#8B5CF6]`, `text-[#38BDF8]`, `text-[#67E8F9]`, `text-[#E0F2FE]`, and `text-[#94A3B8]`. Do not alter spacing, markup hierarchy, component props, or copy.

- [ ] **Step 2: Verify shared source**

Run TypeScript and ESLint:

```powershell
npx tsc --noEmit
npm run lint
```

Expected: both pass.

---

### Task 3: Global Surfaces, Cards, Buttons, and Ambient World

**Files:**
- Modify: `app/globals.css:40-1025`

**Mapping:**
- Dark green surfaces become `#080B18` or translucent blue-black.
- Green CTA gradients become primary purple gradients derived with `color-mix()` against background.
- Green borders become sapphire or purple translucent borders.
- Green glow/particles become cyan.
- Existing red errors and amber warning/severity values remain unchanged.

- [ ] **Step 1: Migrate shared primitives**

Update `.card-outline`, `.focus-ring`, `.route-portal`, ambient stars/mist/orbits/motes, buttons, navigation lines, card borders, links, topic/wiki/rule/news rows, icons, and CTA portal effects.

- [ ] **Step 2: Migrate homepage cinematic visuals**

Recolor hero vignette overlays, scanline, status dot, title sweep, scroll cue, stats, and mode energy from forest green to purple/sapphire/cyan while keeping existing animation properties unchanged.

- [ ] **Step 3: Run tests and lint**

```powershell
npm test
npm run lint
```

Expected: all tests pass and no warnings appear.

---

### Task 4: Authentication Color System

**Files:**
- Modify: `app/globals.css:1026-1842`
- Modify: `components/auth/auth-shell.tsx` only where inline branded colors exist.
- Modify: `components/auth/login-form.tsx` and `components/auth/register-form.tsx` only where inline branded colors exist.

**Mapping:**
- Auth page/frame/panel backgrounds: blue-black.
- Tabs, primary button, active steps, brand wordmark: purple.
- Links, informational borders, verification cells: sapphire.
- Typing pulse, caret, focus, OTP active state, status dot: cyan.
- Titles: highlight; body and labels: primary/secondary text.
- Errors remain red; success combines cyan icon/text with a distinct sapphire surface.

- [ ] **Step 1: Migrate auth shell and illustration overlays**

Replace green radial backgrounds, grid lines, borders, wordmark accents, status glow, and portal scan with approved translucent derivatives.

- [ ] **Step 2: Migrate form controls and feedback**

Update tabs, inputs, focus rings, typing effects, checkboxes, buttons, OTP cells, resend controls, stepper, success feedback, and dev-code treatment without changing form logic.

- [ ] **Step 3: Verify auth behavior**

```powershell
node --experimental-strip-types --test tests/auth-ui.test.mts tests/auth-http.test.mts
npx tsc --noEmit
```

Expected: tests and types pass.

---

### Task 5: Electric Sapphire Cinematic Loader

**Files:**
- Modify: `app/globals.css:1843-end`

**Mapping:**
- Sky: blue-black with purple and sapphire radial depth.
- Shutters and brand suffix: purple.
- Stars, particles, progress fill/tip, pending scanner: cyan.
- Progress frame and rune divisions: sapphire.
- Wordmark: highlight and primary text.

- [ ] **Step 1: Recolor every loader visual layer**

Change colors only. Preserve `transform`, `opacity`, durations, state selectors, keyframes, responsive rules, and reduced-motion rules.

- [ ] **Step 2: Verify loader behavior**

```powershell
node --experimental-strip-types --test tests/cinematic-loader.test.mts
```

Expected: all cinematic state and progress tests pass.

---

### Task 6: Legacy Scan, Accessibility, and Delivery

**Files:**
- Modify only files reported by the contract test or legacy scan.

- [ ] **Step 1: Run the palette contract**

```powershell
node --experimental-strip-types --test tests/color-palette.test.mts
```

Expected: seven tokens match exactly and banned legacy hex literals are absent.

- [ ] **Step 2: Audit semantic exceptions**

Confirm red is used only for error/destructive states and amber only for warning/severity. Confirm body text, buttons, muted text, and focus rings remain readable against `#080B18`.

- [ ] **Step 3: Run full verification with dev servers stopped**

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: full suite passes, types and lint are clean, and production build succeeds.

- [ ] **Step 4: Restore one dev server**

Start only one `next dev` instance on port 3000 to avoid `.next` output contention, then verify HTTP 200.
