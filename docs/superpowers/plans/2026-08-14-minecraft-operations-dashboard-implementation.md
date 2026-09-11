# Minecraft Operations Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm rõ `/control/minecraft`, sửa avatar bị CSP chặn và cho owner/admin xóa an toàn dữ liệu của cụm offline qua alert dialog.

**Architecture:** Logic xóa nằm trong service transaction độc lập, HTTP handler đảm nhiệm Control session, role, same-origin và CSRF. Dashboard chỉ hiển thị status, mở dialog và gọi API bằng `controlFetch`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL, Node test runner, CSS.

## Global Constraints

- Chỉ xóa telemetry, player và nonce của cụm offline.
- Không xóa `game_modes`, banner, tag hoặc key trong `.env`.
- Freshness dùng cửa sổ 30 giây giống status aggregator.
- Chỉ owner/admin được thao tác và mọi DELETE phải qua same-origin cùng CSRF.
- Avatar chỉ mở CSP cho `https://mc-heads.net`.

---

### Task 1: Offline group deletion transaction

**Files:**
- Create: `lib/minecraft/group-admin.ts`
- Create: `tests/minecraft-group-admin.test.mts`

**Interfaces:**
- Produces: `deleteOfflineMinecraftGroup(actor, groupKey, db?, now?)`
- Returns success with `deletedServers`, or failure `404|409`.

- [x] Write tests for stale deletion, fresh rejection, missing group, query order, audit and rollback.
- [x] Run focused tests and verify missing module failure.
- [x] Implement row-locking transaction, nonce deletion, server deletion and audit.
- [x] Re-run focused tests and verify pass.

### Task 2: Secured DELETE endpoint

**Files:**
- Create: `lib/minecraft/group-http.ts`
- Create: `app/api/control/minecraft/groups/[group]/route.ts`
- Create: `tests/minecraft-group-http.test.mts`

**Interfaces:**
- Consumes: `deleteOfflineMinecraftGroup`.
- Produces: `createMinecraftGroupDeleteHandler(deps?)`.

- [x] Write tests for session, role, CSRF, origin, identifier, 404, 409, 200 and 503.
- [x] Run focused tests and verify failure.
- [x] Implement handler and dynamic DELETE route.
- [x] Re-run focused tests and verify pass.

### Task 3: Operations dashboard and confirmation dialog

**Files:**
- Create: `components/control/minecraft-group-delete-dialog.tsx`
- Modify: `components/control/minecraft-dashboard.tsx`
- Modify: `app/globals.css`
- Modify: `tests/minecraft-control-ui.test.mts`

**Interfaces:**
- Dialog consumes selected offline group, busy state and confirm/cancel callbacks.
- Dashboard calls `DELETE /api/control/minecraft/groups/[group]` with `controlFetch`.

- [x] Add failing UI assertions for health strip, offline-only action, alertdialog and controlFetch.
- [x] Run focused UI test and verify failure.
- [x] Implement four operational metrics and clearer cluster summary/actions.
- [x] Implement accessible confirm dialog with cancel focus, Escape, backdrop and busy lock.
- [x] On success remove the group/server data from local state; on failure retain data and announce error.
- [x] Add responsive CSS and verify focused tests.

### Task 4: Avatar CSP and final verification

**Files:**
- Modify: `middleware.ts`
- Modify: `tests/minecraft-control-ui.test.mts`

**Interfaces:**
- Control CSP allows only `https://mc-heads.net` as the external image source.

- [x] Add failing CSP assertion.
- [x] Update `img-src` without wildcarding external hosts.
- [x] Run `npm test`, `npm run build`, `npx tsc --noEmit`, and `npm run lint` sequentially.
- [x] Runtime check status page and MCHeads image without deleting live DB rows.
