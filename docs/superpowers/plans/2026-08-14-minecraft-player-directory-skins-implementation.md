# Minecraft Player Directory And Mojang Skins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm bộ lọc người chơi, sửa hierarchy/layout cụm và lấy skin hiện tại từ Mojang theo username trên `/control/minecraft`.

**Architecture:** Module Mojang skin che giấu hai upstream lookup và validation texture sau một interface nhỏ, route Control chịu trách nhiệm auth/cache/redirect. Module player directory thuần dữ liệu chịu trách nhiệm flatten, filter và loại tên vị trí trùng; React chỉ quản lý filter state và render.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Node test runner, CSS, Mojang profile/session APIs.

## Global Constraints

- Không sửa telemetry payload, database hoặc plugin Paper.
- Skin lookup dùng username hiện tại, cache 300 giây và chỉ redirect đến `https://textures.minecraft.net/texture/<hash>`.
- Người chơi không có Mojang profile dùng fallback ký tự, không dùng Steve giả.
- Route skin chỉ dành cho Control Owner/Admin.
- Filter dùng native input/select và hoạt động bằng bàn phím.

---

### Task 1: Mojang skin resolver and secured route

**Files:**
- Create: `lib/minecraft/mojang-skin.ts`
- Create: `lib/minecraft/mojang-skin-http.ts`
- Create: `app/api/control/minecraft/player-skin/[username]/route.ts`
- Replace: `tests/minecraft-player-head.test.mts`
- Create: `tests/minecraft-skin-http.test.mts`

**Interfaces:**
- Produces: `resolveMojangSkinUrl(username, fetcher?)` returning a safe texture URL or `null`.
- Produces: `createMinecraftSkinHandler(deps?)` returning the authenticated GET handler.

- [x] Write resolver tests for valid lookup, invalid username, missing profile, malformed Base64 and rejected texture hosts.
- [x] Run focused tests and verify the resolver module is missing.
- [x] Implement two-step Mojang lookup with strict texture URL validation and 300-second upstream revalidation.
- [x] Write route tests for 401, 403, 404 and safe cached redirect.
- [x] Implement the Control-authenticated dynamic route.
- [x] Re-run focused tests and verify pass.

### Task 2: Player directory filtering module

**Files:**
- Create: `lib/minecraft/player-directory.ts`
- Create: `tests/minecraft-player-directory.test.mts`

**Interfaces:**
- Produces: `buildMinecraftPlayerDirectory(status)`.
- Produces: `filterMinecraftPlayers(players, filters)`.
- Produces: `formatMinecraftLocation(group, server)`.

- [x] Write failing tests for text, cluster, backend, world and ping filters plus duplicate location labels.
- [x] Run focused tests and verify the module is missing.
- [x] Implement flat player entries, deterministic options and composable filters.
- [x] Re-run focused tests and verify pass.

### Task 3: Dashboard controls, hierarchy and responsive density

**Files:**
- Modify: `components/control/minecraft-dashboard.tsx`
- Modify: `components/control/minecraft-player-head.tsx`
- Modify: `app/globals.css`
- Modify: `middleware.ts`
- Modify: `next.config.mjs`
- Modify: `tests/minecraft-control-ui.test.mts`

**Interfaces:**
- Consumes: player directory module and local skin route from Tasks 1-2.

- [x] Add failing UI assertions for four filters, result count, clear action, isolated cluster slug, single-card class and two skin layers.
- [x] Run UI test and verify failure.
- [x] Replace UUID avatar lookup with username route and CSS face/hat crop over a letter fallback.
- [x] Add linked filter state and accessible native controls to the player directory.
- [x] Separate cluster/backend identity and remove duplicate plugin location text.
- [x] Make a single backend fill the available group width and retain two columns for multiple backends.
- [x] Replace MCHeads CSP/config with the exact Mojang texture host.
- [x] Re-run focused UI tests and verify pass.

### Task 4: Final verification

**Files:**
- Modify: `docs/superpowers/plans/2026-08-14-minecraft-player-directory-skins-implementation.md`

- [x] Run focused Minecraft tests.
- [x] Run `npm test`.
- [x] Run plugin tests with Java 21 using `plugins/edolas-telemetry/gradlew.bat test`.
- [x] Run `npm run build`, `npx tsc --noEmit`, and `npm run lint` sequentially.
- [x] Runtime-check unauthorized skin route, Control CSP and a Mojang profile lookup without changing database rows.
