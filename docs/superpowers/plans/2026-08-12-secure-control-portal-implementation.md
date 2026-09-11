# Secure Control Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tao cong `/control` doc lap va bao mat de quan ly toan bo website bang phien quan tri xac thuc hai buoc.

**Architecture:** Phien website chi dung de bat dau challenge; password va OTP tao mot phien Control rieng trong MySQL. Tat ca mutation Control di qua guard dung chung gom idle timeout, RBAC, same-origin va CSRF, trong khi middleware them security headers va danh dau request de root layout bo website chrome.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL 8, Nodemailer/Gmail, Tailwind CSS, Node test runner.

## Global Constraints

- Control session idle timeout: 30 phut.
- OTP: 10 phut, toi da 5 lan thu.
- Admin vo hieu hoa 1-365 ngay; vinh vien chi Owner.
- Khong co mat khau mac dinh, khong hien secret trong UI/log.
- Moi mutation co server authorization, CSRF/origin validation va audit.

---

### Task 1: Control Security Schema And Session Core

**Files:** Create `lib/control/session.ts`, `lib/control/schema.ts`, `database/07_secure_control.sql`, migration script and tests.

- [ ] Test token hashing, 30-minute idle rule, replay-safe tables and indexes.
- [ ] Implement challenge/session/reset-token storage and migration.
- [ ] Run focused tests and migration replay test.

### Task 2: Password And Gmail OTP Access Flow

**Files:** Create `lib/control/access.ts`, `lib/control/http.ts`, access API routes, access form/page and tests.

- [ ] Test role/email/password checks, rate limit, OTP attempts and cookie issuance.
- [ ] Implement password verification, Gmail delivery, OTP verification and logout.
- [ ] Build accessible two-stage access screen.

### Task 3: CSRF, Origin And Security Headers

**Files:** Create `lib/control/guard.ts`, `middleware.ts`, route-handler tests.

- [ ] Test normal website session rejection, idle expiry, wrong Origin and CSRF.
- [ ] Implement bound CSRF cookie/header and control session guard.
- [ ] Apply no-store/CSP/frame/referrer/permissions headers.

### Task 4: Isolated Control Portal Migration

**Files:** Create `/control` routes/layout, update root layout/account menu, convert `/admin` to redirects and update tests.

- [ ] Test independent SSR chrome and new-tab link.
- [ ] Reuse Control components with `/control` navigation/API paths.
- [ ] Redirect legacy pages and disable legacy mutation APIs.

### Task 5: Advanced User Administration

**Files:** Extend admin schema/service/validation/UI/API and auth queries.

- [ ] Test timed/permanent disable rules, automatic expiry and session revocation.
- [ ] Implement disable/restore and reset-password email initiation.
- [ ] Add clear accessible controls and audit entries.

### Task 6: Remaining Website Management

**Files:** Add website resource service/API/UI for announcements, game modes, rules and stats.

- [ ] Test whitelisted resources, validation and transactional audit.
- [ ] Implement list/create/update/trash controls.
- [ ] Connect public pages to database-backed values with safe fallback.

### Task 7: Verification

- [ ] Run all tests, typecheck, lint and production build.
- [ ] Apply migration twice and inspect Control tables/indexes.
- [ ] Verify Owner uniqueness and no default credentials/secrets.
