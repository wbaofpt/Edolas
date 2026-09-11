# Header, Account Menu, and Game Mode Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear fixed-header overlap, add an accessible signed-in account dropdown with in-place logout, and redesign game mode cards across both surfaces.

**Architecture:** A tested client auth helper owns the logout request and refresh boundary. A focused `AccountMenu` client component owns disclosure, dismissal, pending, and error UI, while a reusable `GameModeCard` owns mode markup and shared CSS owns all visual treatment.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Framer Motion, Tailwind CSS, CSS custom properties, Node test runner.

## Global Constraints

- Preserve the approved `#080B18`, `#8B5CF6`, `#38BDF8`, `#67E8F9`, `#E0F2FE`, `#F8FAFC`, and `#94A3B8` palette.
- Red remains reserved for the destructive logout action and existing errors.
- Logout uses the existing `POST /api/auth/logout` route and preserves the current page.
- Preserve loader timing, authentication cookies, database behavior, navigation copy, and mode content.
- Account controls must remain keyboard accessible and at least 44px high.
- Animate only `transform` and `opacity`; honor reduced-motion.
- Add no dependency, image, or video asset.
- Workspace has no `.git`; verification checkpoints replace commit steps.

---

### Task 1: Tested Client Logout Boundary

**Files:**
- Create: `lib/auth/client.ts`
- Create: `tests/auth-client.test.mts`

**Interfaces:**
- Produces `logoutCurrentSession(deps: LogoutClientDependencies): Promise<void>`.
- `LogoutClientDependencies` contains optional `request` and required `refresh` callbacks.
- Throws `Error("Không thể đăng xuất. Vui lòng thử lại.")` when the response is not successful.

- [ ] **Step 1: Write the failing success-path test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { logoutCurrentSession } from "../lib/auth/client.ts";

test("logout posts to the current-session endpoint and refreshes the current page", async () => {
  let refreshCount = 0;
  let requestMethod = "";
  let requestUrl = "";

  await logoutCurrentSession({
    request: async (input, init) => {
      requestUrl = input;
      requestMethod = String(init?.method);
      return { ok: true };
    },
    refresh: () => {
      refreshCount += 1;
    }
  });

  assert.equal(requestUrl, "/api/auth/logout");
  assert.equal(requestMethod, "POST");
  assert.equal(refreshCount, 1);
});
```

- [ ] **Step 2: Run RED**

```powershell
node --experimental-strip-types --test tests/auth-client.test.mts
```

Expected: FAIL because `lib/auth/client.ts` does not exist.

- [ ] **Step 3: Add the minimal helper**

```ts
type LogoutRequest = (
  input: string,
  init?: RequestInit
) => Promise<{ ok: boolean }>;

export type LogoutClientDependencies = {
  request?: LogoutRequest;
  refresh: () => void;
};

export async function logoutCurrentSession({
  request = fetch,
  refresh
}: LogoutClientDependencies) {
  const response = await request("/api/auth/logout", { method: "POST" });

  if (!response.ok) {
    throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
  }

  refresh();
}
```

- [ ] **Step 4: Run GREEN**

```powershell
node --experimental-strip-types --test tests/auth-client.test.mts
```

Expected: PASS.

- [ ] **Step 5: Add the failing response test**

```ts
test("logout keeps the current page state when the request fails", async () => {
  let refreshCount = 0;

  await assert.rejects(
    logoutCurrentSession({
      request: async () => ({ ok: false }),
      refresh: () => {
        refreshCount += 1;
      }
    }),
    /Không thể đăng xuất/
  );

  assert.equal(refreshCount, 0);
});
```

- [ ] **Step 6: Run the helper tests**

```powershell
node --experimental-strip-types --test tests/auth-client.test.mts
```

Expected: 2 tests pass.

---

### Task 2: Accessible Account Dropdown

**Files:**
- Create: `components/account-menu.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes `PublicUser` and `logoutCurrentSession`.
- Produces `AccountMenu({ user, open, onOpenChange, compact? })`.
- `compact` adapts trigger/dropdown sizing inside mobile navigation.
- `open` and `onOpenChange` make the disclosure controlled so `SiteHeader` can coordinate desktop and mobile menus.

- [ ] **Step 1: Build the account menu state and dismissal boundary**

Create a client component with these state variables and refs:

```tsx
const [loggingOut, setLoggingOut] = useState(false);
const [error, setError] = useState("");
const rootRef = useRef<HTMLDivElement>(null);
const router = useRouter();
const reducedMotion = useReducedMotion();
```

Accept `open: boolean` and `onOpenChange: (open: boolean) => void` as props. While open, register `pointerdown` to call `onOpenChange(false)` when `rootRef` does not contain the target and `keydown` to close on `Escape`. Remove both listeners in the effect cleanup.

- [ ] **Step 2: Add the semantic trigger**

The trigger must be a 44px-or-taller button containing avatar, display name, username, and `ChevronDown`:

```tsx
<button
  type="button"
  className="account-trigger focus-ring"
  aria-expanded={open}
  aria-haspopup="menu"
  aria-controls="account-menu"
  onClick={() => onOpenChange(!open)}
>
  {/* avatar and two-line identity */}
  <ChevronDown className={open ? "account-chevron is-open" : "account-chevron"} />
</button>
```

Keep the existing avatar fallback initial and broken-image fallback behavior.

- [ ] **Step 3: Add the animated menu and logout action**

Use `AnimatePresence` and a `motion.div` with opacity/y only. The menu includes an account summary and:

```tsx
<button
  type="button"
  role="menuitem"
  className="account-logout focus-ring"
  disabled={loggingOut}
  onClick={handleLogout}
>
  <LogOut className="h-4 w-4" />
  {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
</button>
```

`handleLogout` clears the prior error, sets pending, awaits `logoutCurrentSession({ refresh: () => router.refresh() })`, closes on success, and displays the thrown message on failure without closing.

- [ ] **Step 4: Add account menu styling**

Add `.account-menu-root`, `.account-trigger`, `.account-avatar`, `.account-chevron`, `.account-dropdown`, `.account-summary`, `.account-logout`, and `.account-error` to `app/globals.css`. Use blue-black surfaces, sapphire borders, purple hover glow, cyan focus/chevron, highlight text, muted username, and red only for logout/error.

For reduced motion, disable trigger lift and chevron rotation under the existing `prefers-reduced-motion` block.

- [ ] **Step 5: Verify component types and lint**

```powershell
npx tsc --noEmit
npm run lint
```

Expected: both pass with no warnings.

---

### Task 3: Header Integration and Fixed-Header Clearance

**Files:**
- Modify: `components/site-header.tsx`
- Modify: `app/game-modes/page.tsx`
- Modify: `app/forum/page.tsx`
- Modify: `app/wiki/page.tsx`
- Modify: `app/discipline/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes `AccountMenu` from Task 2.
- Keeps `SiteHeader({ user })` public props unchanged.

- [ ] **Step 1: Replace the static account identity**

Remove local `AccountIdentity` from `site-header.tsx`, import `AccountMenu`, and render it in both desktop and mobile signed-in branches. Add separate `desktopAccountOpen` and `mobileAccountOpen` state. Opening or closing the mobile navigation sets both account states to false; opening one account menu closes the other.

- [ ] **Step 2: Stabilize the logo geometry**

Change the logo markup to use a non-shrinking link/icon and a non-wrapping text block:

```tsx
<Link className="site-logo flex shrink-0 items-center gap-3 ...">
  <span className="pixel-logo site-logo-icon flex size-11 shrink-0 ...">...</span>
  <div className="site-logo-copy min-w-[9rem] whitespace-nowrap">
    <p className="minecraft-title text-[13px] leading-5 ...">EDOLASSG</p>
    <p className="minecraft-display text-lg leading-none ...">Minecraft Network</p>
  </div>
</Link>
```

Add `.site-logo-copy` only for optical spacing if the explicit line heights still need a one-pixel adjustment; do not use absolute positioning.

- [ ] **Step 3: Clear the fixed header on every content route**

Replace `pt-10` with `pt-28` on the four `CinematicPage` wrappers. Keep all other width, horizontal padding, and bottom padding classes unchanged.

- [ ] **Step 4: Verify route source and header compilation**

```powershell
rg -n 'pt-10' app/game-modes/page.tsx app/forum/page.tsx app/wiki/page.tsx app/discipline/page.tsx
npx tsc --noEmit
```

Expected: `rg` returns no matches and TypeScript passes.

---

### Task 4: Shared Cinematic Game Mode Card

**Files:**
- Create: `components/game-mode-card.tsx`
- Modify: `app/page.tsx`
- Modify: `app/game-modes/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes `GameMode` from `lib/types.ts` and `TiltCard`.
- Produces `GameModeCard({ mode, index, titleAs? })` where `titleAs` is `"h2" | "h3"` and defaults to `"h3"`.

- [ ] **Step 1: Create the reusable card markup**

```tsx
export function GameModeCard({
  mode,
  index,
  titleAs: Title = "h3"
}: {
  mode: GameMode;
  index: number;
  titleAs?: "h2" | "h3";
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <TiltCard className="h-full">
      <article className="mode-card group h-full">
        <span className="mode-card-glow" aria-hidden="true" />
        <div className="mode-card-meta">
          <span className="mode-index">MODE // {number}</span>
          <span className="mode-status">{mode.players}</span>
        </div>
        <div className={`mode-line bg-gradient-to-r ${mode.accent}`} />
        <Title className="mode-title">{mode.name}</Title>
        <p className="mode-summary">{mode.summary}</p>
        <div className="mode-features">
          {mode.features.map((feature) => (
            <span key={feature} className="tag-chip">{feature}</span>
          ))}
        </div>
      </article>
    </TiltCard>
  );
}
```

- [ ] **Step 2: Replace duplicated homepage markup**

Keep `AnimatedCard` and its delay. Replace its inner `TiltCard`/mode markup with `GameModeCard mode={mode} index={index}`.

- [ ] **Step 3: Replace duplicated game-modes route markup**

Keep `StaggerItem`. Replace the inner card with `GameModeCard mode={mode} index={index} titleAs="h2"`; update the map callback to receive `index` and remove unused `PlayCircle`/`TiltCard` imports.

- [ ] **Step 4: Implement the shared card visual system**

Expand the existing mode CSS with:

- `position: relative`, `isolation: isolate`, `overflow: hidden`, and a blue-black layered background on `.mode-card`.
- Sapphire border and inset highlight; purple corner radial glow via `.mode-card-glow`.
- Two-digit cyan `.mode-index`, sapphire `.mode-status`, highlight `.mode-title`, muted `.mode-summary`.
- Feature chips with subtle sapphire borders and blue-black surfaces.
- Hover/focus-within lift and border glow; diagonal sheen uses opacity/transform only.
- Single-column mobile layout and wrapped metadata below 480px.

Do not change `.mode-line` keyframe timing or the mode gradient data.

- [ ] **Step 5: Run UI, motion, and palette checks**

```powershell
node --experimental-strip-types --test tests/motion.test.mts tests/color-palette.test.mts
npx tsc --noEmit
npm run lint
```

Expected: all commands pass.

---

### Task 5: Full Verification and Runtime Check

**Files:**
- Modify only files reported by verification failures.

- [ ] **Step 1: Audit required behavior**

Confirm source contains one account trigger, one desktop/mobile integration path, `aria-expanded`, `aria-haspopup="menu"`, outside-click dismissal, `Escape` dismissal, pending copy, inline failure copy, and `router.refresh()` after successful logout.

- [ ] **Step 2: Stop the current dev server before production build**

Identify only the process listening on port 3000 and stop that process. Confirm no listener exists on 3001. Do not stop unrelated Node processes.

- [ ] **Step 3: Run the complete verification suite**

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all tests pass, typecheck and lint have zero errors/warnings, and all application routes compile.

- [ ] **Step 4: Restore one development server**

Start one hidden `npm run dev` process in `D:\Edolas`, wait for port 3000, and request `http://127.0.0.1:3000`.

Expected: HTTP 200 on port 3000 and no listener on port 3001.

- [ ] **Step 5: Visual acceptance check**

At desktop and mobile widths verify:

- Back links and headings begin below the header.
- Wordmark and subtitle do not overlap.
- Account dropdown aligns within the viewport and closes with outside click/Escape.
- Logout preserves the current URL and replaces account identity with the login button.
- Cards show index, status, energy rail, description, and feature chips without clipping.
- Reduced-motion removes nonessential displacement.
