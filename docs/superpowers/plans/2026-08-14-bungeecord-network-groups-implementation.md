# BungeeCord Network Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggregate every fresh Paper backend in a BungeeCord network, map telemetry groups to public game modes, group Control telemetry, and provision backend configs without storing keys in MySQL.

**Architecture:** `lib/minecraft/public-status.ts` remains the single aggregate boundary and returns privacy-safe network/group data without capacity. Public content joins those groups to `game_modes.slug`; Control builds a richer group view from the same server rows. A separate pure provisioning module edits only the telemetry entry in `.env`, while a thin CLI handles filesystem and stdout.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.6, MySQL 8/mysql2, Node test runner, Paper 1.21/Java 21, HMAC-SHA-256 telemetry.

## Global Constraints

- Install EdolasTelemetry on every Paper backend, not on BungeeCord/Waterfall/Velocity.
- Each `server-id` has one independent secret of at least 32 bytes.
- `group` maps exactly to `game_modes.slug`.
- Public UI and public API never expose player max, username, UUID, world, plugin health, or secrets.
- A backend is fresh only while `last_seen_at` is between zero and 30 seconds old.
- Public group state is ONLINE when at least one backend is fresh; mixed freshness is DEGRADED only in Control.
- Do not add a database migration or change telemetry schema v1.
- Do not persist telemetry keys in MySQL.
- Preserve reduced-motion behavior and keyboard-accessible Control disclosure controls.
- This workspace is not a Git repository; commit steps are intentionally omitted.

---

### Task 1: Privacy-Safe Network And Group Aggregation

**Files:**
- Modify: `tests/minecraft-public-status.test.mts`
- Modify: `lib/minecraft/public-status.ts`
- Modify: `tests/minecraft-control-http.test.mts`

**Interfaces:**
- Produces: `PublicMinecraftStatus = { status, online, lastUpdatedAt, groups }` with no `max`.
- Produces: `PublicMinecraftGroupStatus = { key, label, status, online, activeServers, totalServers }`.
- Consumes: existing `PublicMinecraftServerRow` database rows, including `max_players` only for backward-compatible row parsing until query cleanup.

- [ ] **Step 1: Write failing aggregate tests**

Add assertions that a fresh and stale backend in one group produce a public ONLINE group with only fresh online players, `activeServers: 1`, `totalServers: 2`, and no `max` property:

```ts
const status = aggregateMinecraftServers(rows, now);
assert.equal(status.status, "online");
assert.equal(status.online, 18);
assert.deepEqual(status.groups[0], {
  key: "survival",
  label: "Survival",
  status: "online",
  online: 18,
  activeServers: 1,
  totalServers: 2
});
assert.equal("max" in status, false);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --experimental-strip-types --test tests/minecraft-public-status.test.mts
```

Expected: FAIL because the current aggregate returns `degraded` and exposes `max`.

- [ ] **Step 3: Implement the public aggregate contract**

Change `aggregateMinecraftServers` so:

```ts
const publicLevel = (fresh: number): "online" | "offline" => fresh > 0 ? "online" : "offline";
```

Track `total`, `fresh`, and fresh-only `online` per group. Remove `max` from public return types and from `readPublicMinecraftStatus` SQL. Keep `display_name` only if runtime row validation still needs it; otherwise remove it from the public row type/query too.

- [ ] **Step 4: Update route fixture types and run focused tests**

Update Control HTTP fixtures to the new public network shape, then run:

```powershell
node --experimental-strip-types --test tests/minecraft-public-status.test.mts tests/minecraft-control-http.test.mts
```

Expected: PASS.

---

### Task 2: Map Telemetry Groups Into Public Game Modes

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/public-website-content.ts`
- Modify: `tests/public-website-content.test.mts`

**Interfaces:**
- Produces: `GameMode.telemetry = { status: "online" | "offline"; online: number }`.
- Consumes: `PublicMinecraftStatus.groups` from Task 1.
- Mapping key: selected `game_modes.slug` equals `PublicMinecraftGroupStatus.key`.

- [ ] **Step 1: Write failing content mapping tests**

Make game mode fixtures include `slug`, then assert:

```ts
assert.deepEqual(content.gameModes[0]?.telemetry, { status: "online", online: 12 });
assert.deepEqual(content.gameModes[1]?.telemetry, { status: "offline", online: 0 });
assert.doesNotMatch(content.heroStats[0]?.detail ?? "", /slot|\//i);
```

Use two fresh `survival` backends to prove their counts are summed before mapping.

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
node --experimental-strip-types --test tests/public-website-content.test.mts
```

Expected: FAIL because the query omits `slug` and `GameMode` has no telemetry field.

- [ ] **Step 3: Implement slug mapping and safe fallbacks**

Extend `GameMode`:

```ts
telemetry: {
  status: "online" | "offline";
  online: number;
};
```

Select `slug` from `game_modes`, build a `Map` from `minecraftStatus.groups`, and map unmatched modes to `{ status: "offline", online: 0 }`. Update bundled fallback game modes with the same telemetry shape. Change the online hero stat detail to describe network activity without max capacity.

- [ ] **Step 4: Run focused tests**

```powershell
node --experimental-strip-types --test tests/public-website-content.test.mts
```

Expected: PASS.

---

### Task 3: Public Network And Game Mode Presentation

**Files:**
- Modify: `components/minecraft-network-status.tsx`
- Modify: `components/game-mode-card.tsx`
- Modify: `app/globals.css`
- Modify: `tests/minecraft-network-ui.test.mts`
- Modify: `tests/game-mode-banner-ui.test.mts`

**Interfaces:**
- Consumes: `PublicMinecraftStatus.online` and `GameMode.telemetry`.
- Public network badge renders status plus one count only.
- Game mode status rail renders ONLINE/OFFLINE plus localized player count.

- [ ] **Step 1: Load minimal UI guidance**

Run:

```powershell
npx ui-skills categories
npx ui-skills list --category craft
```

Select at most two narrow skills covering status badges/card overlays and reduced-motion/accessibility.

- [ ] **Step 2: Write failing source-level UI tests**

Require these patterns:

```ts
assert.doesNotMatch(statusSource, /status\.max|\/\s*\{status\.max\}/);
assert.match(cardSource, /mode\.telemetry\.online/);
assert.match(cardSource, /mode-card-status/);
assert.match(cssSource, /prefers-reduced-motion/);
```

Remove the obsolete assertion requiring `DEGRADED` from the public badge.

- [ ] **Step 3: Run UI tests and verify RED**

```powershell
node --experimental-strip-types --test tests/minecraft-network-ui.test.mts tests/game-mode-banner-ui.test.mts
```

Expected: FAIL because max is still rendered and cards omit telemetry.

- [ ] **Step 4: Implement the public UI**

Render network badge as:

```tsx
<span className={`connection-dock-online is-${level}`} aria-live="polite">
  <i aria-hidden="true" />
  <span>{labels[level]}</span>
  <b>{status.online}</b>
</span>
```

Add a `.mode-card-status` rail inside `.mode-card-meta` with a visible state dot, state label, and `${online} nguoi choi`. Keep content tags unchanged. Use only opacity and transform transitions and retain a reduced-motion override.

- [ ] **Step 5: Run UI and content tests**

```powershell
node --experimental-strip-types --test tests/minecraft-network-ui.test.mts tests/game-mode-banner-ui.test.mts tests/public-website-content.test.mts
```

Expected: PASS.

---

### Task 4: Build Control Group View Model

**Files:**
- Modify: `lib/minecraft/control-status.ts`
- Modify: `tests/minecraft-control-status.test.mts`
- Modify: `tests/minecraft-control-http.test.mts`

**Interfaces:**
- Produces: `ControlMinecraftGroup`.
- Produces: `ControlMinecraftStatus.groups` alongside `network` and `servers`.

The exact group type is:

```ts
export type ControlMinecraftGroup = {
  key: string;
  label: string;
  mapped: boolean;
  status: "online" | "degraded" | "offline";
  online: number;
  activeServers: number;
  totalServers: number;
  servers: ControlMinecraftServer[];
};
```

- [ ] **Step 1: Write failing group model tests**

Use one fresh and one stale Survival server plus one fresh unknown group. Assert Survival is degraded, counts are fresh-only, players stay attached to the correct server, and unknown groups have `mapped: false`.

The database test double must respond to a new safe query:

```sql
SELECT slug,name FROM game_modes WHERE deleted_at IS NULL
```

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
node --experimental-strip-types --test tests/minecraft-control-status.test.mts tests/minecraft-control-http.test.mts
```

Expected: FAIL because `groups` does not exist.

- [ ] **Step 3: Implement grouped Control output**

Build server objects once, index game modes by slug, group servers by `group`, and derive:

```ts
const status = activeServers === 0
  ? "offline"
  : activeServers === servers.length
    ? "online"
    : "degraded";
```

Use game mode name as label when mapped, otherwise derive a readable label and set `mapped: false`. Sort mapped groups before unmapped groups, then by label.

- [ ] **Step 4: Run focused tests**

```powershell
node --experimental-strip-types --test tests/minecraft-control-status.test.mts tests/minecraft-control-http.test.mts
```

Expected: PASS.

---

### Task 5: Redesign Control Minecraft By Group

**Files:**
- Modify: `components/control/minecraft-dashboard.tsx`
- Modify: `app/globals.css`
- Modify: `tests/minecraft-network-ui.test.mts`
- Create: `tests/minecraft-control-ui.test.mts`

**Interfaces:**
- Consumes: `ControlMinecraftStatus.groups` from Task 4.
- Group disclosure is a native `<details>`/`<summary>` control for keyboard and screen-reader support.
- Server cards remain detailed and are rendered within their owning group.

- [ ] **Step 1: Write failing Control UI tests**

Assert the dashboard renders from `status.groups`, uses accessible disclosure markup, shows group online/backend counts, removes network max capacity, and keeps player search fields for group/server/world.

```ts
assert.match(source, /status\?\.groups/);
assert.match(source, /<details/);
assert.match(source, /activeServers/);
assert.doesNotMatch(source, /network\.max/);
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node --experimental-strip-types --test tests/minecraft-control-ui.test.mts
```

Expected: FAIL because the dashboard currently renders one flat server grid.

- [ ] **Step 3: Implement grouped dashboard structure**

Replace the flat card grid with group sections. Group summary includes status, online, and `${activeServers}/${totalServers} backend`. Render server cards inside each section. Default degraded/offline groups open; if every group is online, default the first group open. Add group to flattened player/plugin view records so search and labels retain context.

- [ ] **Step 4: Add responsive and state styling**

Add focused classes under the existing `.minecraft-control-*` namespace. Keep square cinematic panels, cyan/purple accents, visible focus styles, 44px summary targets, mobile one-column layout, and compositor-safe disclosure/status motion.

- [ ] **Step 5: Run Control tests**

```powershell
node --experimental-strip-types --test tests/minecraft-control-status.test.mts tests/minecraft-control-http.test.mts tests/minecraft-control-ui.test.mts
```

Expected: PASS.

---

### Task 6: Provision Multiple Backend Configurations

**Files:**
- Create: `lib/minecraft/provisioning.ts`
- Create: `scripts/add-minecraft-server.mts`
- Create: `tests/minecraft-provisioning.test.mts`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Produces: `provisionMinecraftServer(input, envText, randomBytes?)` as a pure function.
- Produces: `{ envText: string; configYaml: string; serverId: string }`.
- CLI consumes the pure function, writes `.env` once, then prints only the newly generated config.

Define input:

```ts
export type MinecraftProvisionInput = {
  serverId: string;
  group: string;
  displayName: string;
  endpoint: string;
  dryRun: boolean;
};
```

- [ ] **Step 1: Write failing provisioning tests**

Test deterministic random bytes, preservation of unrelated `.env` lines, preservation of existing server keys, duplicate rejection, invalid identifiers, remote HTTP rejection, localhost HTTP acceptance, YAML quoting, and dry-run no-write behavior at the CLI boundary.

```ts
const result = provisionMinecraftServer(input, source, () => Buffer.alloc(32, 7));
assert.match(result.envText, /MINECRAFT_TELEMETRY_KEYS=/);
assert.match(result.configYaml, /server-id: "survival-02"/);
assert.match(result.configYaml, /api-key: "/);
```

- [ ] **Step 2: Run focused test and verify RED**

```powershell
node --experimental-strip-types --test tests/minecraft-provisioning.test.mts
```

Expected: FAIL because the provisioning module does not exist.

- [ ] **Step 3: Implement the pure provisioning module**

Reuse `MINECRAFT_SERVER_ID_PATTERN`, generate 32 random bytes and Base64-encode them, parse/update exactly one `MINECRAFT_TELEMETRY_KEYS` assignment, preserve all other text, and serialize YAML values with JSON string quoting. Reject duplicate IDs before producing output.

- [ ] **Step 4: Implement the thin CLI**

Parse exact flags `--id`, `--group`, `--name`, `--endpoint`, and optional `--dry-run`. Read `D:\Edolas\.env` via `process.cwd()`, call the pure module, write with a temporary sibling file plus rename when not dry-run, and print a warning that stdout contains a secret followed by `configYaml`.

Add:

```json
"minecraft:add-server": "node --experimental-strip-types scripts/add-minecraft-server.mts"
```

- [ ] **Step 5: Run provisioning tests and a dry run**

```powershell
node --experimental-strip-types --test tests/minecraft-provisioning.test.mts
npm run minecraft:add-server -- --id test-01 --group test --name "Test 01" --endpoint "http://127.0.0.1:3000/api/minecraft/telemetry" --dry-run
```

Expected: tests PASS; dry run prints valid YAML and leaves `.env` unchanged.

---

### Task 7: Documentation And End-To-End Verification

**Files:**
- Modify: `plugins/edolas-telemetry/README.md`
- Modify: `README.md`
- Verify: `plugins/edolas-telemetry/build/libs/edolas-telemetry-1.0.0.jar`

**Interfaces:**
- Documents one plugin per Paper backend, shared group by mode, unique ID/key, Quick Tunnel caveat, and CLI workflow.

- [ ] **Step 1: Update operator documentation**

Document examples for two Survival backends and one Skyblock backend, explain that BungeeCord itself does not run the plugin, and show:

```powershell
npm run minecraft:add-server -- --id survival-02 --group survival --name "Survival 02" --endpoint "https://example.com/api/minecraft/telemetry"
```

State that restarting the website is required after `.env` changes and restarting Paper is required after `config.yml` changes.

- [ ] **Step 2: Run all website verification**

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all tests pass, typecheck/lint exit 0, and Next production build includes `/api/minecraft/status`, `/api/minecraft/telemetry`, and `/control/minecraft`.

- [ ] **Step 3: Run plugin verification with Java 21**

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.10'
Set-Location D:\Edolas\plugins\edolas-telemetry
.\gradlew.bat clean test shadowJar --no-daemon
```

Expected: `BUILD SUCCESSFUL` and the shaded JAR remains at `build/libs/edolas-telemetry-1.0.0.jar`.

- [ ] **Step 4: Verify no public capacity or secret leakage**

```powershell
rg -n "status\.max|network\.max|api-key|MINECRAFT_TELEMETRY_KEYS" components app lib
```

Expected: no public component reads capacity; secret references are limited to server-side config/provisioning code and never contain a literal generated key.
