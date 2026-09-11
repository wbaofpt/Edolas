# Edolas Store, Header And Command Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây cửa hàng mô phỏng có gói tùy chỉnh trong Control Center, đơn chờ admin duyệt, giao lệnh console at-most-once qua plugin Paper và header công khai mới.

**Architecture:** Module `lib/store` sở hữu validation, catalog, order transaction và delivery queue. Route công khai dùng website session; route quản trị dùng Control session + CSRF; route plugin dùng HMAC server hiện có. Plugin Paper poll delivery độc lập với telemetry và chỉ dispatch command trên Bukkit main thread.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL 8, Node test runner, Paper 1.21.1, Java 21, Gradle, Gson, Framer Motion, Lucide.

## Global Constraints

- Không tích hợp thanh toán thật hoặc webhook trong phiên bản này.
- Client không thể tự đánh dấu đơn đã thanh toán hoặc tạo delivery.
- Chỉ Owner/Admin được quản lý gói và duyệt/hủy đơn.
- Một delivery được claim tối đa một lần và không tự requeue.
- Chỉ hỗ trợ `{player}`, `{package}`, `{amount}`, `{cluster}` trong một command tối đa 512 ký tự, không có newline.
- API công khai không trả command template hoặc command đã render.
- Mọi mutation Control dùng same-origin, Control CSRF và Control session hiện có.
- UI dùng native controls, focus rõ, target tối thiểu 44px và tôn trọng reduced motion.
- Workspace không có Git metadata; bỏ qua bước commit và không tạo worktree.

---

### Task 1: Store schema and validation

**Files:**
- Create: `database/09_store.sql`
- Create: `lib/store/schema.ts`
- Create: `lib/store/validation.ts`
- Create: `scripts/migrate-store.mts`
- Modify: `package.json`
- Test: `tests/store-schema.test.mts`
- Test: `tests/store-validation.test.mts`

**Interfaces:**
- Produces: `applyStoreMigration(db)`.
- Produces: `parseStorePackageInput(value)`, `parseStoreOrderInput(value)`, `renderStoreCommand(template, variables)`.

- [x] **Step 1: Write failing schema and validation tests**

```ts
assert.match(sql, /CREATE TABLE IF NOT EXISTS store_packages/);
assert.match(sql, /UNIQUE KEY store_delivery_order_unique \(order_id\)/);
assert.deepEqual(parseStoreOrderInput({ packageId: 1, minecraftUsername: "QuocBaooo", paymentMethod: "momo" }).ok, true);
assert.equal(renderStoreCommand("lp user {player} parent add vip", variables), "lp user QuocBaooo parent add vip");
assert.equal(parseStorePackageInput({ commandTemplate: "op {unknown}" }).ok, false);
```

- [x] **Step 2: Run tests and verify missing modules fail**

Run: `node --experimental-strip-types --test tests/store-schema.test.mts tests/store-validation.test.mts`

- [x] **Step 3: Implement replay-safe tables and strict parsers**

```ts
export type StorePaymentMethod = "momo" | "bank";
export const STORE_COMMAND_VARIABLES = ["player", "package", "amount", "cluster"] as const;
export function renderStoreCommand(template: string, variables: Record<(typeof STORE_COMMAND_VARIABLES)[number], string>): string;
```

- [x] **Step 4: Add migration CLI and package script**

```json
"db:migrate:store": "node --experimental-strip-types scripts/migrate-store.mts"
```

- [x] **Step 5: Re-run focused tests**

Expected: all Task 1 tests pass.

### Task 2: Public catalog and account order service

**Files:**
- Create: `lib/store/service.ts`
- Create: `lib/store/http.ts`
- Create: `app/api/store/catalog/route.ts`
- Create: `app/api/store/orders/route.ts`
- Test: `tests/store-service.test.mts`
- Test: `tests/store-http.test.mts`

**Interfaces:**
- Consumes: Task 1 validation types.
- Produces: `listStoreCatalog(db?, now?)`, `createStoreOrder(user, input, deps?)`, `listUserStoreOrders(userId, db?)`.
- Produces: `createStoreCatalogHandler`, `createStoreOrdersHandler`.

- [x] **Step 1: Write failing catalog/order transaction tests**

```ts
const result = await createStoreOrder(user, { packageId: 4, minecraftUsername: "QuocBaooo", paymentMethod: "bank" }, { db, now });
assert.equal(result.order.status, "pending_payment");
assert.match(result.order.reference, /^EDO-[A-Z0-9]{10}$/);
assert.equal(recordedSql.some((sql) => sql.includes("store_command_deliveries")), false);
```

- [x] **Step 2: Verify tests fail before implementation**

Run: `node --experimental-strip-types --test tests/store-service.test.mts tests/store-http.test.mts`

- [x] **Step 3: Implement safe public projections and order ownership**

```ts
export type PublicStorePackage = { id:number; slug:string; name:string; description:string; groupKey:string; priceVnd:number; accent:string };
export type PublicStoreOrder = { id:number; reference:string; packageName:string; groupKey:string; minecraftUsername:string; paymentMethod:StorePaymentMethod; priceVnd:number; status:StoreOrderStatus; createdAt:string };
```

Catalog joins live `minecraft_servers` only to derive group online status. Order creation locks the active package, checks its group has a fresh backend, snapshots all visible fields and never reads command template into the response.

- [x] **Step 4: Implement authenticated GET/POST route**

POST resolves `SESSION_COOKIE_NAME`, rejects anonymous users with 401 and returns `Cache-Control: no-store`.

- [x] **Step 5: Re-run focused tests**

Expected: public catalog/order tests pass.

### Task 3: Control package and order operations

**Files:**
- Create: `lib/store/admin-service.ts`
- Create: `lib/store/admin-http.ts`
- Create: `app/api/control/store/packages/route.ts`
- Create: `app/api/control/store/packages/[id]/route.ts`
- Create: `app/api/control/store/orders/[id]/approve/route.ts`
- Create: `app/api/control/store/orders/[id]/cancel/route.ts`
- Test: `tests/store-admin-service.test.mts`
- Test: `tests/store-admin-http.test.mts`

**Interfaces:**
- Produces: `listStoreAdminData(filters, db?)`, `saveStorePackage(actor, input, id?, db?)`, `approveStoreOrder(actor, orderId, db?, now?)`, `cancelStoreOrder(actor, orderId, db?)`.

- [x] **Step 1: Write failing role, CSRF and atomic approval tests**

```ts
assert.equal((await approveStoreOrder(admin, 8, db)).ok, true);
assert.match(statements.join("\n"), /SELECT.+store_orders.+FOR UPDATE/s);
assert.match(statements.join("\n"), /INSERT INTO store_command_deliveries/);
assert.match(statements.join("\n"), /INSERT INTO admin_audit_logs/);
assert.equal(await handler(requestWithoutCsrf).then(r => r.status), 403);
```

- [x] **Step 2: Verify focused tests fail**

Run: `node --experimental-strip-types --test tests/store-admin-service.test.mts tests/store-admin-http.test.mts`

- [x] **Step 3: Implement package mutations and approval transaction**

Approval locks pending order and package, renders the command from the order snapshot, creates one pending delivery, updates order to `approved`, writes audit and commits together. Duplicate approval returns 409.

- [x] **Step 4: Implement Control-authenticated handlers**

Use `validateControlMutation`, `CONTROL_SESSION_COOKIE`, `resolveControlSession(..., { csrfToken })` and `canManageUsers` exactly like existing account-admin routes.

- [x] **Step 5: Re-run focused tests**

Expected: admin store tests pass.

### Task 4: Signed delivery claim and completion API

**Files:**
- Create: `lib/store/delivery.ts`
- Create: `lib/store/delivery-http.ts`
- Create: `app/api/minecraft/deliveries/route.ts`
- Test: `tests/store-delivery.test.mts`
- Test: `tests/store-delivery-http.test.mts`

**Interfaces:**
- Produces: `claimStoreDelivery(serverId, db?, now?)` and `completeStoreDelivery(input, db?, now?)`.
- Produces: `createStoreDeliveryHandler(deps?)`.

- [x] **Step 1: Write failing HMAC, claim and complete tests**

```ts
assert.equal((await handler(unsignedRequest)).status, 401);
assert.equal((await handler(validClaimRequest)).status, 200);
assert.equal(claim.body.command, "lp user QuocBaooo parent add vip");
assert.equal((await handler(secondClaimRequest)).status, 204);
assert.equal((await handler(validCompleteRequest)).status, 202);
```

- [x] **Step 2: Verify focused tests fail**

Run: `node --experimental-strip-types --test tests/store-delivery.test.mts tests/store-delivery-http.test.mts`

- [x] **Step 3: Implement reusable signed-request verifier**

Extract only the common HMAC envelope from telemetry without changing canonical format: server ID, timestamp, nonce, exact UTF-8 body and `v1=` signature. Delivery body limit is 16 KiB.

- [x] **Step 4: Implement transactional at-most-once claim**

```sql
SELECT d.id,d.command_text FROM store_command_deliveries d
JOIN minecraft_servers s ON s.server_id=? AND s.group_key=d.group_key
WHERE d.status='pending' AND s.last_seen_at>=? ORDER BY d.id LIMIT 1 FOR UPDATE
```

Update delivery to `claimed`, order to `delivering`, store SHA-256 claim token and return raw token once. Completion validates token with timing-safe comparison and updates delivery/order atomically.

- [x] **Step 5: Re-run focused tests**

Expected: signed delivery tests pass.

### Task 5: Paper delivery worker

**Files:**
- Modify: `plugins/edolas-telemetry/src/main/resources/config.yml`
- Modify: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/config/TelemetryConfig.java`
- Modify: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/EdolasTelemetryPlugin.java`
- Modify: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/transport/HttpTelemetryTransport.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/delivery/CommandDelivery.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/delivery/CommandDeliveryClient.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/delivery/CommandDeliveryWorker.java`
- Test: `plugins/edolas-telemetry/src/test/java/vn/edolas/telemetry/delivery/CommandDeliveryWorkerTest.java`
- Modify: `plugins/edolas-telemetry/src/test/java/vn/edolas/telemetry/config/TelemetryConfigTest.java`

**Interfaces:**
- Consumes: `/api/minecraft/deliveries` protocol from Task 4.
- Produces: a scheduled worker that claims off-thread, dispatches one command on main thread and reports completion off-thread.

- [x] **Step 1: Write failing config and worker tests**

```java
assertEquals("https://example.com/api/minecraft/deliveries", config.deliveryEndpoint().toString());
worker.poll();
verify(dispatcher).dispatch("lp user QuocBaooo parent add vip");
verify(client).complete(42L, "claim-token", true, "Command accepted");
```

- [x] **Step 2: Run Java tests and verify failure**

Run: `$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.10'; .\gradlew.bat test`

- [x] **Step 3: Implement config and signed HTTP client**

Add:

```yaml
delivery-endpoint: "https://example.com/api/minecraft/deliveries"
delivery-interval-seconds: 5
```

Requests reuse `RequestSigner`, never log API key, command or claim token, reject redirects and cap response bodies.

- [x] **Step 4: Wire main-thread dispatch and lifecycle**

Use Bukkit scheduler for `dispatchCommand`; keep network I/O on a daemon executor; cancel worker and close client in `onDisable`.

- [x] **Step 5: Re-run Java tests**

Expected: all plugin tests pass on Java 21.

### Task 6: Public store wizard and receipt history

**Files:**
- Create: `app/store/page.tsx`
- Create: `components/store/storefront.tsx`
- Create: `components/store/store-package-card.tsx`
- Create: `components/store/store-checkout.tsx`
- Create: `components/store/store-order-history.tsx`
- Modify: `app/globals.css`
- Test: `tests/store-ui.test.mts`

**Interfaces:**
- Consumes: `PublicStorePackage`, `PublicStoreOrder`, public store API.

- [x] **Step 1: Write failing UI assertions**

Assert visible labels for Minecraft username, cluster, package and payment method; four-step progress; MoMo/bank choices; review panel; login gate; order status; `aria-live`; reduced-motion CSS.

- [x] **Step 2: Run UI test and verify failure**

Run: `node --experimental-strip-types --test tests/store-ui.test.mts`

- [x] **Step 3: Build server page and client wizard**

Use a single state machine `identity -> package -> payment -> review -> receipt`. `startTransition` wraps order submission and errors are linked with `aria-describedby`/`aria-invalid`.

- [x] **Step 4: Add responsive terminal-marketplace styling**

Desktop uses package grid plus sticky receipt rail; mobile is one column with a compact progress strip. Animate only opacity/transform for 180-260 ms and disable in `prefers-reduced-motion`.

- [x] **Step 5: Re-run UI tests**

Expected: store UI tests pass.

### Task 7: Control Store workspace

**Files:**
- Create: `app/control/(protected)/store/page.tsx`
- Create: `components/control/store-manager.tsx`
- Create: `components/control/store-package-form.tsx`
- Create: `components/control/store-order-table.tsx`
- Create: `components/control/store-approve-dialog.tsx`
- Modify: `components/admin/admin-shell.tsx`
- Modify: `app/globals.css`
- Test: `tests/control-store-ui.test.mts`

**Interfaces:**
- Consumes: Task 3 admin services and endpoints.

- [x] **Step 1: Write failing Control UI tests**

Assert Store navigation, KPI labels, order filters, command preview, package create/edit fields, named confirmation dialog and explicit warning that approval queues a real console command.

- [x] **Step 2: Verify tests fail**

Run: `node --experimental-strip-types --test tests/control-store-ui.test.mts`

- [x] **Step 3: Build permission-gated server page and manager**

`requireControlAccountAdmin()` loads admin data. All mutations use `controlFetch`. Approve dialog requires typing the order reference before enabling confirm and restores focus after close.

- [x] **Step 4: Add clear status and stale-claim presentation**

Map statuses to Vietnamese labels and icon + text, not color alone. A claimed delivery older than two minutes displays `Cần kiểm tra` without mutating/requeueing it.

- [x] **Step 5: Re-run Control UI tests**

Expected: Control Store UI tests pass.

### Task 8: Header redesign and store navigation

**Files:**
- Modify: `lib/content.ts`
- Modify: `components/site-header.tsx`
- Modify: `components/account-menu.tsx`
- Modify: `app/globals.css`
- Test: `tests/site-header-store.test.mts`

**Interfaces:**
- Consumes: `/store` and existing `SiteHeader` user context.

- [x] **Step 1: Write failing header tests**

Assert `Cửa hàng` CTA, pathname-aware current page, desktop `Cộng đồng` disclosure, mobile navigation, account `Đơn hàng của tôi`, Escape behavior and accessible names.

- [x] **Step 2: Verify test fails**

Run: `node --experimental-strip-types --test tests/site-header-store.test.mts`

- [x] **Step 3: Implement three-zone responsive header**

Use `usePathname`, native buttons/links and controlled disclosures. Keep account dropdown API intact. Close menus on route click and outside pointer; Escape restores focus.

- [x] **Step 4: Add scroll compression and active styling**

Use transform/opacity/color transitions only; retain stable outer header height to prevent layout shift. Store CTA remains visible at desktop and mobile.

- [x] **Step 5: Re-run header and existing account tests**

Run: `node --experimental-strip-types --test tests/site-header-store.test.mts tests/account-menu.test.mts`

### Task 9: Migration, documentation and final verification

**Files:**
- Modify: `plugins/edolas-telemetry/README.md`
- Modify: `.env.example` only if a non-secret store setting is required
- Modify: `docs/superpowers/plans/2026-08-14-store-header-command-delivery-implementation.md`

- [x] **Step 1: Apply replay-safe store migration**

Run: `npm run db:migrate:store` twice. Expected: both runs exit 0.

- [x] **Step 2: Run focused store and delivery tests**

Run all `tests/store-*.test.mts`, `tests/control-store-ui.test.mts`, and `tests/site-header-store.test.mts`.

- [x] **Step 3: Run complete web verification**

Run sequentially:

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

- [x] **Step 4: Run complete plugin verification and build artifact**

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.10'
.\gradlew.bat clean test shadowJar
```

- [x] **Step 5: Runtime smoke checks**

Verify catalog returns no command fields, anonymous order creation is 401, unsigned delivery claim is 401, `/store` is 200, `/control/store` is protected, and generated plugin JAR exists. Do not create or approve a real order during smoke testing.
