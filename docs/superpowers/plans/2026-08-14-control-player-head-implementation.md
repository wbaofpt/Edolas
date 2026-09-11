# Control Player Head Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị đầu skin Minecraft theo UUID cạnh người chơi online trong Control Center với fallback an toàn.

**Architecture:** Helper thuần chuẩn hóa UUID và tạo URL MCHeads. Component client quản lý lỗi ảnh, còn dashboard chỉ chịu trách nhiệm đặt component vào layout bảng.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS, Node test runner.

## Global Constraints

- Không thay đổi payload telemetry hoặc schema MySQL.
- Ảnh dùng UUID đã chuẩn hóa, kích thước 40px và `alt=""`.
- Khi UUID hoặc ảnh không hợp lệ phải hiện fallback chữ cái.
- Giữ nguyên ngôn ngữ thiết kế của Control Center và không thêm animation lặp.

---

### Task 1: UUID-safe player head source

**Files:**
- Create: `lib/minecraft/player-head.ts`
- Create: `tests/minecraft-player-head.test.mts`

**Interfaces:**
- Produces: `normalizeMinecraftUuid(value: string): string | null`
- Produces: `minecraftPlayerHeadUrl(uuid: string): string | null`

- [x] **Step 1: Write failing tests for dashed UUID, compact UUID and invalid input**
- [x] **Step 2: Run `node --experimental-strip-types --test tests/minecraft-player-head.test.mts` and verify missing module failure**
- [x] **Step 3: Implement exact 32-hex validation and MCHeads avatar URL generation**
- [x] **Step 4: Re-run the focused test and verify pass**

### Task 2: Accessible player identity cell

**Files:**
- Create: `components/control/minecraft-player-head.tsx`
- Modify: `components/control/minecraft-dashboard.tsx`
- Modify: `app/globals.css`
- Modify: `tests/minecraft-control-ui.test.mts`
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: `minecraftPlayerHeadUrl(uuid)` from Task 1.
- Produces: `MinecraftPlayerHead({ uuid, username })` with decorative image and visible fallback.

- [x] **Step 1: Add failing source assertions for player head, fallback, empty alt and player identity layout**
- [x] **Step 2: Run the focused UI test and verify failure**
- [x] **Step 3: Add the client component using Next Image, reset failure state when UUID changes, and configure the MCHeads image host**
- [x] **Step 4: Insert the component beside username/UUID and add compact pixel-frame CSS**
- [x] **Step 5: Run focused tests, then `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`**
