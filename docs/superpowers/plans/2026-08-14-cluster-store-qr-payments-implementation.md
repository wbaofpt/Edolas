# Cluster Store And QR Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build isolated Store catalogs for four Minecraft clusters and a sandbox-first QR payment pipeline with signed live-provider adapters, idempotent webhook delivery, and complete payment activity logs.

**Architecture:** Keep catalog ownership in `store_groups -> store_categories -> store_packages`. Add a provider boundary under `lib/store/payments`; order creation persists an attempt before external I/O, provider callbacks flow through one transaction-safe settlement function, and the existing plugin delivery queue remains the only command execution path.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.6, MySQL 8, Node crypto/fetch, `qrcode.react`, node:test, existing Control session/CSRF and Paper delivery protocol.

## Global Constraints

- Sandbox is the default and never accepts real money.
- Production must reject sandbox delivery when `STORE_SANDBOX_ALLOW_DELIVERY=true`.
- MBBank is connected through payOS/VietQR; never store or use personal Internet Banking credentials.
- Provider secrets stay server-side in environment variables and never enter API responses, logs, or database payloads.
- Amount, order ownership, group, package, player, and command snapshots come from server data.
- Webhook retries and races with manual approval must create at most one delivery per order.
- The four Store groups are `op-skyblock`, `survival`, `fantasy-skyblock`, and `smp`.
- Existing orders and deliveries remain intact.
- Workspace `D:\Edolas` is not a Git repository, so commit steps are replaced by explicit test/review checkpoints.

---

### Task 1: Seed Independent Cluster Catalogs

**Files:**
- Modify: `database/09_store.sql`
- Modify: `lib/store/schema.ts`
- Modify: `tests/store-schema.test.mts`
- Create: `tests/store-cluster-seed.test.mts`

**Interfaces:**
- Produces: `STORE_GROUP_SEEDS` and `STORE_CATEGORY_SEEDS` exported from `lib/store/schema.ts`.
- Produces: replay-safe `applyStoreMigration()` that inserts missing groups/categories without overwriting admin names.

- [ ] **Step 1: Write failing seed tests**

```ts
assert.deepEqual(STORE_GROUP_SEEDS.map((item) => item.key), [
  "op-skyblock", "survival", "fantasy-skyblock", "smp",
]);
assert.equal(
  STORE_CATEGORY_SEEDS.filter((item) => item.groupKey === "fantasy-skyblock").length,
  3,
);
assert.match(schemaSource, /INSERT IGNORE INTO store_groups/);
assert.match(schemaSource, /INSERT IGNORE INTO store_categories/);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-schema.test.mts tests/store-cluster-seed.test.mts`

Expected: FAIL because seed constants and idempotent inserts do not exist.

- [ ] **Step 3: Add exact seed data**

```ts
export const STORE_GROUP_SEEDS = [
  { key: "op-skyblock", name: "OP Skyblock", sortOrder: 0 },
  { key: "survival", name: "Survival", sortOrder: 10 },
  { key: "fantasy-skyblock", name: "Fantasy Skyblock", sortOrder: 20 },
  { key: "smp", name: "SMP", sortOrder: 30 },
] as const;

export const STORE_CATEGORY_SEEDS = [
  { groupKey: "survival", slug: "ranks", name: "Rank", sortOrder: 10 },
  { groupKey: "survival", slug: "items", name: "Vật phẩm", sortOrder: 20 },
  { groupKey: "survival", slug: "utilities", name: "Tiện ích", sortOrder: 30 },
  { groupKey: "fantasy-skyblock", slug: "ranks", name: "Rank", sortOrder: 10 },
  { groupKey: "fantasy-skyblock", slug: "crates", name: "Crate", sortOrder: 20 },
  { groupKey: "fantasy-skyblock", slug: "battle-pass", name: "Battle Pass", sortOrder: 30 },
  { groupKey: "smp", slug: "ranks", name: "Rank", sortOrder: 10 },
  { groupKey: "smp", slug: "cosmetics", name: "Mỹ phẩm", sortOrder: 20 },
  { groupKey: "smp", slug: "bundles", name: "Combo", sortOrder: 30 },
] as const;
```

Insert each row with `INSERT IGNORE` after category index reconciliation so existing admin-edited rows are not updated.

- [ ] **Step 4: Verify GREEN and replay**

Run tests from Step 2, then run `npm run db:migrate:store` twice.

Expected: tests pass; both migrations exit 0; existing OP Skyblock counts remain unchanged and three new groups each have three categories.

- [ ] **Step 5: Review checkpoint**

Query group/category counts and confirm no package or order moved to another `group_key`.

---

### Task 2: Complete Package Deletion And Cluster-Scoped Control UX

**Files:**
- Modify: `lib/store/admin-service.ts`
- Modify: `lib/store/admin-http.ts`
- Modify: `app/api/control/store/packages/[id]/route.ts`
- Modify: `components/control/store-manager.tsx`
- Modify: `app/globals.css`
- Modify: `tests/store-admin-service.test.mts`
- Modify: `tests/store-admin-http.test.mts`
- Modify: `tests/control-store-ui.test.mts`

**Interfaces:**
- Produces: `deleteStorePackage(actor, id, db) -> { ok: true; imagePath: string | null } | Failure`.
- Produces: `createStorePackageDeleteHandler()` and route `DELETE`.
- Consumes: existing `selectedGroupKey`, `scopedCategories`, `scopedPackages`.

- [ ] **Step 1: Write failing service and HTTP tests**

```ts
const result = await deleteStorePackage(actor, 12, fakeDb);
assert.deepEqual(result, { ok: true, imagePath: "/uploads/store/packages/a.webp" });
assert.ok(statements.some((item) => item.sql.includes("DELETE FROM store_packages")));
assert.ok(statements.some((item) => item.sql.includes("store.package.delete")));

const response = await createStorePackageDeleteHandler(deps)(
  controlRequest("DELETE"),
  { params: { id: "12" } },
);
assert.equal(response.status, 200);
```

Add rejection coverage for invalid id, missing package, expired Control session, wrong role, wrong origin, and missing CSRF.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-admin-service.test.mts tests/store-admin-http.test.mts tests/control-store-ui.test.mts`

Expected: FAIL because package delete exports, route, and UI action are absent.

- [ ] **Step 3: Implement transaction-safe deletion**

```ts
export async function deleteStorePackage(
  actor: PublicUser,
  id: number,
  db: StoreAdminDb = getPool(),
): Promise<{ ok: true; imagePath: string | null } | Failure>
```

Lock `SELECT id,name,image_path FROM store_packages WHERE id=? FOR UPDATE`, delete the row, insert `store.package.delete` audit, and return the managed public image path. Do not modify orders; the existing foreign key sets `package_id=NULL`.

- [ ] **Step 4: Add route and Control UI**

Export `DELETE=createStorePackageDeleteHandler()`. Add a destructive button to each package card and package dialog. Confirm with:

```ts
window.confirm(`Xóa gói ${item.name}? Đơn cũ vẫn được giữ nhưng thao tác này không thể hoàn tác.`)
```

On success, remove the package from state and recompute category/group counts. Ensure every create/edit action uses `selectedGroupKey` and only categories with matching `groupKey`.

- [ ] **Step 5: Verify GREEN**

Run tests from Step 2 plus `npx tsc --noEmit`.

Expected: all pass; no cross-cluster category appears in the package editor.

---

### Task 3: Payment Schema, Types, Configuration, And QR Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `database/09_store.sql`
- Modify: `lib/store/schema.ts`
- Create: `lib/store/payments/types.ts`
- Create: `lib/store/payments/config.ts`
- Modify: `.env.example`
- Create: `tests/store-payment-schema.test.mts`
- Create: `tests/store-payment-config.test.mts`

**Interfaces:**
- Produces: `PaymentProviderName = "sandbox" | "payos" | "momo"`.
- Produces: `PaymentSession`, `VerifiedPaymentEvent`, `PaymentProvider`.
- Produces: `readPaymentConfig(env)` with sandbox/live guards.

- [ ] **Step 1: Write failing schema/config tests**

```ts
assert.match(sql, /CREATE TABLE IF NOT EXISTS store_payment_attempts/);
assert.match(sql, /CREATE TABLE IF NOT EXISTS store_payment_events/);
assert.match(sql, /UNIQUE KEY store_payment_provider_order_unique/);
assert.match(sql, /UNIQUE KEY store_payment_event_unique/);

assert.throws(
  () => readPaymentConfig({
    NODE_ENV: "production",
    STORE_PAYMENT_MODE: "sandbox",
    STORE_SANDBOX_ALLOW_DELIVERY: "true",
  }),
  /sandbox delivery/i,
);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-payment-schema.test.mts tests/store-payment-config.test.mts`

Expected: FAIL because tables and config module do not exist.

- [ ] **Step 3: Add tables and replay migration**

Create attempts/events exactly as specified, including foreign keys to orders/attempts, provider/order and provider/event unique keys, queue/log indexes, snapshot columns, timestamps, and token hash for sandbox completion. Add nullable `client_request_key CHAR(36)` to orders and unique `(user_id, client_request_key)` through replay-safe `information_schema` checks.

- [ ] **Step 4: Define provider boundary**

```ts
export type PaymentSession = {
  providerOrderId: string;
  checkoutUrl: string | null;
  qrContent: string;
  expiresAt: Date;
};

export type VerifiedPaymentEvent = {
  provider: PaymentProviderName;
  eventKey: string;
  providerOrderId: string;
  transactionId: string;
  amountVnd: number;
  successful: boolean;
  safePayload: Record<string, unknown>;
};

export interface PaymentProvider {
  createSession(input: CreatePaymentInput): Promise<PaymentSession>;
  verifyWebhook(payload: unknown): VerifiedPaymentEvent;
}
```

- [ ] **Step 5: Implement strict configuration**

Parse booleans explicitly, require HTTPS `APP_PUBLIC_URL` in live mode, require provider credentials only for the selected method, and never print values. Add the exact environment keys from the spec.

- [ ] **Step 6: Install QR renderer and verify GREEN**

Run: `npm install qrcode.react`.

Run tests from Step 2 and `npx tsc --noEmit`.

Expected: tests pass and lockfile records the dependency.

---

### Task 4: Sandbox, payOS, And MoMo Provider Adapters

**Files:**
- Create: `lib/store/payments/crypto.ts`
- Create: `lib/store/payments/sandbox.ts`
- Create: `lib/store/payments/payos.ts`
- Create: `lib/store/payments/momo.ts`
- Create: `lib/store/payments/provider.ts`
- Create: `tests/store-payment-sandbox.test.mts`
- Create: `tests/store-payment-payos.test.mts`
- Create: `tests/store-payment-momo.test.mts`

**Interfaces:**
- Produces: `safeEqualHex(expected, actual)`.
- Produces: `createSandboxProvider(config, deps)`.
- Produces: `createPayosProvider(config, deps)`.
- Produces: `createMomoProvider(config, deps)`.
- Produces: `getPaymentProvider(method, config)`.

- [ ] **Step 1: Write failing cryptographic fixture tests**

For MoMo, assert the canonical create signature and IPN signature against fixed keys/payload. For payOS, assert HMAC SHA-256 over sorted create fields and sorted webhook `data`. Assert one changed amount invalidates each signature. For sandbox, assert tokens are random, stored only as SHA-256 hashes, and expired tokens reject.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-payment-sandbox.test.mts tests/store-payment-payos.test.mts tests/store-payment-momo.test.mts`

Expected: FAIL because adapters do not exist.

- [ ] **Step 3: Implement constant-time verification**

```ts
export function safeEqualHex(expected: string, actual: string) {
  if (!/^[a-f0-9]+$/i.test(expected) || !/^[a-f0-9]+$/i.test(actual)) return false;
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
```

- [ ] **Step 4: Implement provider create/verify**

Use injected `fetch` in tests. payOS creates a VietQR payment request with numeric `orderCode` derived from attempt id and validates webhook checksum. MoMo uses `requestType="captureWallet"`, test endpoint from config, HMAC SHA-256 canonical field order, `ipnUrl` and `redirectUrl` from `APP_PUBLIC_URL`. Map provider payloads into `VerifiedPaymentEvent` and whitelist safe payload keys.

- [ ] **Step 5: Implement sandbox adapter**

Return QR content containing a signed, expiring sandbox completion URL. Return only raw token to the one create-session response; persist its SHA-256 hash. Completion verifies the hash and expiry.

- [ ] **Step 6: Verify GREEN**

Run tests from Step 2 and `npx tsc --noEmit`.

Expected: valid fixtures pass; tampering tests fail verification.

---

### Task 5: Payment Orchestration And Idempotent Settlement

**Files:**
- Modify: `lib/store/service.ts`
- Modify: `lib/store/admin-service.ts`
- Create: `lib/store/payments/service.ts`
- Modify: `tests/store-service.test.mts`
- Modify: `tests/store-admin-service.test.mts`
- Create: `tests/store-payment-service.test.mts`

**Interfaces:**
- Produces: `createStoreOrderWithPayment(user, input, deps)`.
- Produces: `settlePaymentEvent(event, deps)`.
- Produces: `getOwnedPaymentStatus(userId, reference, db)`.
- Produces: `queueStoreDelivery(connection, order, actorId?)` reused by admin approval and webhook.

- [ ] **Step 1: Write failing orchestration tests**

Cover:

```ts
assert.equal(created.payment.status, "awaiting_payment");
assert.equal(created.payment.amountVnd, selectedPackage.priceVnd);
assert.equal(created.payment.accountUsername, actor.username);
assert.equal(created.payment.minecraftUsername, "QuocBaooo");
```

Also cover duplicate idempotency key returns the original order, provider failure cancels the order, wrong amount rejects settlement, invalid signature event never settles, duplicate webhook returns duplicate, and concurrent/manual approval creates one delivery.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-service.test.mts tests/store-admin-service.test.mts tests/store-payment-service.test.mts`

Expected: FAIL because payment orchestration and shared delivery queue do not exist.

- [ ] **Step 3: Refactor shared delivery insertion**

Extract the existing command rendering and delivery insert into:

```ts
export async function queueStoreDelivery(
  connection: StoreConnection,
  order: StoreDeliveryOrder,
  actorId: number | null,
): Promise<{ deliveryId: number; command: string }>
```

Keep the unique `order_id` constraint as the final idempotency guard. Admin approval locks order before calling it.

- [ ] **Step 4: Implement order + attempt creation**

Validate UUID idempotency key, lock package/group, load current account email by `user.id`, persist order/attempt snapshots, commit, call provider without holding DB locks, then update the attempt. On duplicate user/key, return the existing owned order and attempt.

- [ ] **Step 5: Implement settlement transaction**

Persist event, then lock attempt/order. Check signature result, provider order id, amount, status and expiry. For a valid paid event, update attempt and order and call `queueStoreDelivery` in one transaction. Duplicate event or existing delivery returns success without another insert.

- [ ] **Step 6: Verify GREEN**

Run tests from Step 2.

Expected: all pass; delivery insert count is exactly one across duplicate/race cases.

---

### Task 6: Payment HTTP Routes And Security Boundaries

**Files:**
- Modify: `lib/store/http.ts`
- Create: `lib/store/payment-http.ts`
- Modify: `app/api/store/orders/route.ts`
- Create: `app/api/store/orders/[reference]/payment/route.ts`
- Create: `app/api/store/payments/sandbox/[token]/complete/route.ts`
- Create: `app/api/store/payments/payos/webhook/route.ts`
- Create: `app/api/store/payments/momo/ipn/route.ts`
- Create: `tests/store-payment-http.test.mts`

**Interfaces:**
- Produces authenticated order/payment status GET.
- Produces same-origin order POST accepting `Idempotency-Key`.
- Produces unsigned-cookie-free provider webhook routes whose authorization is the provider signature.

- [ ] **Step 1: Write failing route tests**

Assert status route returns 401 without session and 404 for another user's reference. Assert order POST rejects missing/invalid idempotency key. Assert live webhooks reject bad signature and accept duplicate valid callbacks. Assert sandbox completion returns 404 outside sandbox mode and 409 for expired token.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-http.test.mts tests/store-payment-http.test.mts`

Expected: FAIL because payment routes do not exist.

- [ ] **Step 3: Implement bounded route handlers**

Use existing `getRequestUser` and same-origin validation for browser routes. Use `readRequestBytes` limits for webhooks. Do not use session or CSRF on provider callbacks; call provider verification instead. Return `Cache-Control: no-store` everywhere.

- [ ] **Step 4: Implement sandbox completion guard**

Only enable when config mode is sandbox. If delivery is disabled, mark attempt `simulated` and leave order pending. If enabled in development, invoke the same settlement path as a signed webhook.

- [ ] **Step 5: Verify GREEN**

Run tests from Step 2 plus `npx tsc --noEmit`.

Expected: all authorization, ownership, signature and expiry tests pass.

---

### Task 7: Storefront QR Checkout And Live Status

**Files:**
- Modify: `app/store/page.tsx`
- Modify: `components/store/storefront.tsx`
- Create: `components/store/payment-qr.tsx`
- Modify: `app/globals.css`
- Modify: `tests/store-ui.test.mts`
- Create: `tests/store-payment-ui.test.mts`

**Interfaces:**
- Consumes order POST response `{ order, payment }`.
- Consumes status GET `{ orderStatus, paymentStatus, deliveryStatus }`.
- Uses `QRCodeSVG` from `qrcode.react`.

- [ ] **Step 1: Write failing UI tests**

Assert source includes `QRCodeSVG`, sandbox warning, amount/reference/player/cluster/package, copy button, countdown, `aria-live`, polling cleanup, terminal-state stop list, and reduced-motion CSS.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-ui.test.mts tests/store-payment-ui.test.mts`

Expected: FAIL because QR component and polling state do not exist.

- [ ] **Step 3: Build focused QR component**

```tsx
export function PaymentQr({
  payment,
  order,
  onStatus,
}: {
  payment: PublicPaymentAttempt;
  order: PublicStoreOrder;
  onStatus: (status: PaymentStatusResponse) => void;
})
```

Render `QRCodeSVG value={payment.qrContent}` at a reserved square size, a visible sandbox ribbon, copy actions, countdown and status timeline. Poll every 3 seconds and stop on `paid`, `simulated`, `expired`, `cancelled`, `failed`, or unmount.

- [ ] **Step 4: Integrate checkout**

Generate one `crypto.randomUUID()` per submit action, send it as `Idempotency-Key`, store returned payment, and replace the old static demo bank information with the QR screen. Keep login resume behavior.

- [ ] **Step 5: Verify GREEN**

Run tests from Step 2, `npx tsc --noEmit`, and `npm run lint`.

Expected: all pass; QR UI does not render merchant secrets or raw provider payload.

---

### Task 8: Control Payment Activity And Audit Timeline

**Files:**
- Modify: `lib/store/admin-service.ts`
- Modify: `components/control/store-manager.tsx`
- Modify: `app/globals.css`
- Modify: `tests/store-admin-service.test.mts`
- Modify: `tests/control-store-ui.test.mts`

**Interfaces:**
- Extends `listStoreAdminData()` with `payments: StoreAdminPayment[]`.
- `StoreAdminPayment` includes safe account/player/package/provider/status/event summary fields only.

- [ ] **Step 1: Write failing projection/UI tests**

Assert admin projection returns account username/email snapshot, Minecraft username, group, package, amount, provider, provider transaction id, attempt status, event outcome and delivery status. Assert source exposes provider/status/group filters and a details dialog without raw secrets.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-admin-service.test.mts tests/control-store-ui.test.mts`

Expected: FAIL because payment activity data and UI are absent.

- [ ] **Step 3: Implement bounded log projection**

Query the newest 200 attempts joined to orders and deliveries. Aggregate event count/latest outcome without selecting full `payload_json`. Map dates to ISO strings.

- [ ] **Step 4: Implement Control UI**

Add a `PAYMENT ACTIVITY` section below order queue with filters for provider, status, group and account/player search. Add a details dialog containing immutable timeline rows. Keep pixel font only on cluster names and compact identity labels.

- [ ] **Step 5: Verify GREEN**

Run tests from Step 2 and `npx tsc --noEmit`.

Expected: all pass; searching a Minecraft name or account email narrows the log.

---

### Task 9: Documentation, Live Configuration, And Full Verification

**Files:**
- Modify: `.env.example`
- Create: `docs/store-payments.md`
- Modify: `tests/store-payment-config.test.mts`

**Interfaces:**
- Documents sandbox startup, Cloudflare Tunnel callback URLs, payOS webhook registration, MoMo IPN/redirect URLs, and the live cutover checklist.

- [ ] **Step 1: Add documentation assertions**

Assert `.env.example` contains every key with empty placeholders and docs contain the four callback paths, HTTPS requirement, sandbox warning and no personal MBBank credentials.

- [ ] **Step 2: Run documentation tests and verify RED**

Run: `node --test --experimental-strip-types tests/store-payment-config.test.mts`

Expected: FAIL until docs and environment examples are complete.

- [ ] **Step 3: Write operator guide**

Document:

- `npm run db:migrate:store`;
- sandbox mode and optional development delivery;
- `cloudflared tunnel --url http://127.0.0.1:3000`;
- payOS linked MBBank channel and webhook URL;
- MoMo test endpoint, IPN and redirect URL;
- adding secrets only to runtime environment;
- live smoke test with the smallest allowed provider amount;
- rollback by disabling provider without deleting payment logs.

- [ ] **Step 4: Run database verification**

Run migration twice. Query group/category/package/order/delivery/payment counts before and after the second run. Confirm no destructive count change.

- [ ] **Step 5: Run complete verification**

Run:

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: zero failed tests, TypeScript exit 0, ESLint zero warnings, production build exit 0.

- [ ] **Step 6: Final security review**

Search source and output for real merchant values, `MOMO_SECRET_KEY` contents, payOS checksum contents, authorization headers in logs, unverified webhook state transitions, and client-supplied amounts. Resolve every finding before completion.
