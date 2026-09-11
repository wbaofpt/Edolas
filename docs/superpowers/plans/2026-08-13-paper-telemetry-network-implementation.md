# Paper Telemetry Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Paper 1.21 plugin in `plugins/edolas-telemetry` that securely pushes multi-server telemetry to EdolasSG and exposes privacy-safe public status plus an Owner/Admin Control dashboard.

**Architecture:** Paper servers collect immutable snapshots on the server thread and send signed JSON asynchronously. A Next.js route verifies HMAC/timestamp/nonce, writes a transactional current snapshot to MySQL, and separate read services expose either public aggregates or privileged Control data.

**Tech Stack:** Next.js 14, TypeScript, Node test runner, MySQL 8/mysql2, React 18, Java 21, Gradle Kotlin DSL, Paper API 1.21.1, JUnit 5, Gson shaded into the plugin.

## Global Constraints

- Plugin location is exactly `plugins/edolas-telemetry`.
- Compile plugin bytecode with Java 21 from `C:\Program Files\Java\jdk-21.0.10`.
- Use Gradle Wrapper; do not require the globally installed Gradle at deployment time.
- Paper dependency is `io.papermc.paper:paper-api:1.21.1-R0.1-SNAPSHOT`; manifest uses `api-version: '1.21'`.
- Network I/O and JSON serialization never run on the Paper server thread.
- Snapshot interval defaults to 10 seconds; stale threshold is 30 seconds.
- Signed requests use HMAC-SHA-256 over the exact raw UTF-8 body, timestamp and nonce.
- Public responses never include username, UUID, ping, world details, plugin health, backend address or raw payload.
- Player identity and detailed server health require an Owner/Admin Control session and `canManageUsers`.
- Telemetry payload is limited to 256 KiB, 32 worlds and 1,000 players.
- The workspace is not a Git repository, so commit steps are replaced with explicit verification checkpoints.

---

### Task 1: Replay-Safe MySQL Telemetry Schema

**Files:**
- Create: `database/08_minecraft_telemetry.sql`
- Create: `lib/minecraft/schema.ts`
- Create: `scripts/migrate-minecraft-telemetry.mts`
- Modify: `package.json`
- Test: `tests/minecraft-telemetry-schema.test.mts`

**Interfaces:**
- Produces: `applyMinecraftTelemetryMigration(db): Promise<void>`.
- Produces tables: `minecraft_servers`, `minecraft_online_players`, `minecraft_telemetry_nonces`.

- [ ] **Step 1: Write the failing schema test**

```ts
test("telemetry migration creates server, player and nonce tables", async () => {
  const sql: string[] = [];
  await applyMinecraftTelemetryMigration({ execute: async (statement: string) => { sql.push(statement); return [{}, undefined]; } } as never);
  assert.equal(sql.some((item) => item.includes("CREATE TABLE IF NOT EXISTS minecraft_servers")), true);
  assert.equal(sql.some((item) => item.includes("CREATE TABLE IF NOT EXISTS minecraft_online_players")), true);
  assert.equal(sql.some((item) => item.includes("CREATE TABLE IF NOT EXISTS minecraft_telemetry_nonces")), true);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --experimental-strip-types --test tests/minecraft-telemetry-schema.test.mts`

Expected: module `lib/minecraft/schema.ts` is missing.

- [ ] **Step 3: Implement replay-safe DDL and migration entrypoint**

Use `VARCHAR(40)` server IDs, `CHAR(36)` UUIDs, `DECIMAL(6,3)` TPS/MSPT values, `BIGINT UNSIGNED` memory/uptime values, JSON columns for world/plugin summaries, a cascade player foreign key, and `(server_id, nonce_hash)` as the nonce primary key. Export each `CREATE_*_SQL` constant and execute them in dependency order.

Add script:

```json
"db:migrate:minecraft": "node --experimental-strip-types scripts/migrate-minecraft-telemetry.mts"
```

- [ ] **Step 4: Verify GREEN and static SQL parity**

Run: `node --experimental-strip-types --test tests/minecraft-telemetry-schema.test.mts`

Run: `rg "minecraft_servers|minecraft_online_players|minecraft_telemetry_nonces" database/08_minecraft_telemetry.sql lib/minecraft/schema.ts`

Expected: test passes and both schema representations contain all three tables.

- [ ] **Step 5: Verification checkpoint**

Run: `npm test`

Expected: existing suite remains green.

### Task 2: Versioned Payload Validation and HMAC Protocol

**Files:**
- Create: `lib/minecraft/types.ts`
- Create: `lib/minecraft/config.ts`
- Create: `lib/minecraft/protocol.ts`
- Create: `lib/minecraft/validation.ts`
- Modify: `.env.example`
- Test: `tests/minecraft-telemetry-protocol.test.mts`
- Test: `tests/minecraft-telemetry-validation.test.mts`

**Interfaces:**
- Produces: `parseTelemetryKeys(env): ReadonlyMap<string, Buffer>`.
- Produces: `createCanonicalRequest(input): string` and `verifyTelemetrySignature(input): boolean`.
- Produces: `parseTelemetryPayload(value): TelemetrySnapshot`.
- Produces exact types `TelemetrySnapshot`, `TelemetryPlayer`, `TelemetryWorld`, `TelemetryPluginHealth`.

- [ ] **Step 1: Write failing protocol and validation tests**

```ts
const canonical = createCanonicalRequest({ serverId: "survival-01", timestamp: "1786636800", nonce: "abc123", rawBody: "{}" });
assert.equal(canonical, `v1\nsurvival-01\n1786636800\nabc123\n${createHash("sha256").update("{}").digest("hex")}`);
assert.equal(verifyTelemetrySignature({ canonical, signature: `v1=${createHmac("sha256", secret).update(canonical).digest("hex")}`, secret }), true);
assert.throws(() => parseTelemetryPayload({ schemaVersion: 2 }), /schemaVersion/);
```

Also assert rejection of invalid IDs, secrets shorter than 32 UTF-8 bytes, negative metrics, more than 32 worlds, more than 1,000 players and malformed UUIDs.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --experimental-strip-types --test tests/minecraft-telemetry-protocol.test.mts tests/minecraft-telemetry-validation.test.mts`

Expected: missing modules.

- [ ] **Step 3: Implement strict parsers and constant-time verification**

Use server ID regex `/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/`, `crypto.timingSafeEqual`, finite-number checks and explicit object/array guards. Parse `MINECRAFT_TELEMETRY_KEYS` as JSON object and reject unknown keys, duplicate-normalized IDs and weak secrets.

Add to `.env.example`:

```dotenv
MINECRAFT_TELEMETRY_KEYS='{"survival-01":"replace-with-at-least-32-random-characters"}'
```

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --experimental-strip-types --test tests/minecraft-telemetry-protocol.test.mts tests/minecraft-telemetry-validation.test.mts`

Expected: all cases pass without printing secrets.

- [ ] **Step 5: Verification checkpoint**

Run: `npx tsc --noEmit`

Expected: no type errors.

### Task 3: Transactional Repository and Signed Ingest Route

**Files:**
- Create: `lib/minecraft/repository.ts`
- Create: `lib/minecraft/telemetry-http.ts`
- Create: `app/api/minecraft/telemetry/route.ts`
- Test: `tests/minecraft-telemetry-repository.test.mts`
- Test: `tests/minecraft-telemetry-http.test.mts`

**Interfaces:**
- Consumes: `TelemetrySnapshot`, key map, canonical verifier and payload parser from Task 2.
- Produces: `saveTelemetrySnapshot(input, deps): Promise<{ acceptedAt: Date }>`.
- Produces: `createTelemetryRouteHandler(deps): (request: Request) => Promise<Response>`.

- [ ] **Step 1: Write failing repository and HTTP tests**

```ts
test("accepted ingest commits server, players and nonce atomically", async () => {
  const result = await saveTelemetrySnapshot({ serverId: "survival-01", nonce: "n-1", snapshot, now }, { db: fakePool });
  assert.deepEqual(result, { acceptedAt: now });
  assert.deepEqual(calls.filter((item) => ["begin", "commit", "rollback"].includes(item)), ["begin", "commit"]);
});

test("route rejects replay before writing a second snapshot", async () => {
  const first = await handler(signedRequest("nonce-1"));
  const replay = await handler(signedRequest("nonce-1"));
  assert.equal(first.status, 202);
  assert.equal(replay.status, 409);
});
```

Cover 400, 401, 409, 413, 429 and 500 responses, 60-second clock skew, HTTPS enforcement in production and missing/invalid headers.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --experimental-strip-types --test tests/minecraft-telemetry-repository.test.mts tests/minecraft-telemetry-http.test.mts`

Expected: missing repository/handler exports.

- [ ] **Step 3: Implement bounded request processing and transaction**

Read `Content-Length` before `request.text()`, then enforce UTF-8 byte length after reading. Verify signature before parsing JSON. In one transaction: create/lock the server row, reject snapshots accepted within 3 seconds, insert nonce hash, upsert metrics, delete that server's player rows, bulk insert current players, delete expired nonces, commit. Roll back on every error and release the connection in `finally`.

Route adapter:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = createTelemetryRouteHandler();
export const POST = handler;
```

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --experimental-strip-types --test tests/minecraft-telemetry-repository.test.mts tests/minecraft-telemetry-http.test.mts`

Expected: transaction order and all status codes pass.

- [ ] **Step 5: Verification checkpoint**

Run: `npm test`

Expected: complete Node test suite passes.

### Task 4: Privacy-Safe Public Aggregation

**Files:**
- Create: `lib/minecraft/public-status.ts`
- Create: `app/api/minecraft/status/route.ts`
- Modify: `lib/public-website-content.ts`
- Test: `tests/minecraft-public-status.test.mts`
- Test: `tests/public-website-content.test.mts`

**Interfaces:**
- Produces: `readPublicMinecraftStatus(db?, now?): Promise<PublicMinecraftStatus>`.
- `PublicMinecraftStatus` contains only `status`, `online`, `max`, `lastUpdatedAt`, and group aggregates.
- Updates `readPublicWebsiteContent` so `online_today` is overlaid in memory, never written to `server_stats`.

- [ ] **Step 1: Write failing aggregate/privacy tests**

```ts
const status = aggregateMinecraftServers(rows, new Date("2026-08-13T12:00:30Z"));
assert.deepEqual(status, { status: "degraded", online: 18, max: 200, lastUpdatedAt: "2026-08-13T12:00:20.000Z", groups: expectedGroups });
assert.equal(JSON.stringify(status).includes("username"), false);
assert.equal(JSON.stringify(status).includes("plugin"), false);
```

Test online at exactly 30 seconds, offline after 30 seconds, zero online for stale rows, retained last known max, and fallback when the table is unavailable.

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --experimental-strip-types --test tests/minecraft-public-status.test.mts tests/public-website-content.test.mts`

Expected: aggregate module/overlay behavior is absent.

- [ ] **Step 3: Implement aggregate service and short-lived cached public route**

Query only columns needed for public output. Derive status from database `last_seen_at`, not plugin data. Return `{ ok: true, status }` with `Cache-Control: public, max-age=5, stale-while-revalidate=10`; never select player/plugin/world JSON in this service.

- [ ] **Step 4: Confirm GREEN**

Run: `node --experimental-strip-types --test tests/minecraft-public-status.test.mts tests/public-website-content.test.mts`

Expected: stale/group/privacy cases pass.

- [ ] **Step 5: Verification checkpoint**

Run: `npx tsc --noEmit`

Expected: no type errors.

### Task 5: Owner/Admin Minecraft Control Surface

**Files:**
- Create: `lib/minecraft/control-status.ts`
- Create: `lib/minecraft/control-http.ts`
- Create: `app/api/control/minecraft/route.ts`
- Create: `app/control/(protected)/minecraft/page.tsx`
- Create: `components/control/minecraft-dashboard.tsx`
- Modify: `components/admin/admin-shell.tsx`
- Modify: `app/globals.css`
- Test: `tests/minecraft-control-status.test.mts`
- Test: `tests/minecraft-control-http.test.mts`

**Interfaces:**
- Produces: `readControlMinecraftStatus(db?, now?): Promise<ControlMinecraftStatus>`.
- Produces: `createControlMinecraftRouteHandler(deps)` guarded by a Control session plus `canManageUsers`.
- UI polls `/api/control/minecraft` every 10 seconds only while `document.visibilityState === "visible"`.

- [ ] **Step 1: Write failing authorization and shape tests**

```ts
assert.equal((await handler(request, staffSession)).status, 403);
assert.equal((await handler(request, adminSession)).status, 200);
assert.deepEqual(adminBody.servers[0].players[0], { uuid: playerUuid, username: "Bao", ping: 42, world: "world" });
```

Test that stale player rows are excluded and `Cache-Control` is `no-store`.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --experimental-strip-types --test tests/minecraft-control-status.test.mts tests/minecraft-control-http.test.mts`

Expected: missing service/handler.

- [ ] **Step 3: Implement protected service, route and page**

Use `requireControlAccountAdmin()` in the server page. The route resolves the Control cookie server-side and uses `canManageUsers`; do not rely on hidden navigation. Add a `Server`/`Activity` navigation entry visible only to Owner/Admin.

Dashboard sections: network summary, freshness signal, server cards, TPS/MSPT/RAM meters, world and critical-plugin tables, and searchable online-player table. Use semantic tables, visible focus, reduced-motion and existing cyan/sapphire/purple tokens.

- [ ] **Step 4: Confirm tests and UI types GREEN**

Run: `node --experimental-strip-types --test tests/minecraft-control-status.test.mts tests/minecraft-control-http.test.mts`

Run: `npx tsc --noEmit`

Expected: authorization and type checks pass.

- [ ] **Step 5: Verification checkpoint**

Run: `npm run lint`

Expected: no ESLint warnings or errors.

### Task 6: Live Homepage Status and Connection Dock

**Files:**
- Create: `components/minecraft-network-status.tsx`
- Modify: `app/page.tsx`
- Modify: `components/cinematic-hero.tsx`
- Modify: `components/server-connection-dock.tsx`
- Modify: `app/globals.css`
- Test: `tests/minecraft-network-ui.test.mts`

**Interfaces:**
- Consumes: SSR `PublicMinecraftStatus` from Task 4.
- `MinecraftNetworkStatus` accepts `initialStatus` and refreshes `/api/minecraft/status` every 10 seconds while visible.
- `CinematicHero` accepts `networkStatus: PublicMinecraftStatus | null`.

- [ ] **Step 1: Write failing source-level UI contract tests**

```ts
assert.match(heroSource, /networkStatus/);
assert.match(statusSource, /visibilitychange/);
assert.match(statusSource, /\/api\/minecraft\/status/);
assert.doesNotMatch(statusSource, /username|playerUuid|pluginHealth/);
```

Also assert status labels `ONLINE`, `DEGRADED`, `OFFLINE` and reduced-motion styling exist.

- [ ] **Step 2: Run UI test and confirm RED**

Run: `node --experimental-strip-types --test tests/minecraft-network-ui.test.mts`

Expected: component and props do not exist.

- [ ] **Step 3: Implement SSR-first live status**

Load status in the existing `Promise.all` on `app/page.tsx`. Pass it into hero/dock, render online/max beside PC/PE connection details, replace the static active badge, and keep the current fallback copy when telemetry is unavailable. Polling must clear its timer on unmount and pause while hidden.

- [ ] **Step 4: Confirm UI contract, accessibility and types**

Run: `node --experimental-strip-types --test tests/minecraft-network-ui.test.mts`

Run: `npx tsc --noEmit`

Expected: tests pass and no client/server boundary violation occurs.

- [ ] **Step 5: Verification checkpoint**

Run: `npm run build`

Expected: production build includes `/api/minecraft/status`, `/api/minecraft/telemetry` and `/control/minecraft`.

### Task 7: Paper Plugin Scaffold, Models and Signer

**Files:**
- Create: `plugins/edolas-telemetry/settings.gradle.kts`
- Create: `plugins/edolas-telemetry/build.gradle.kts`
- Generate: `plugins/edolas-telemetry/gradlew`, `gradlew.bat`, `gradle/wrapper/*`
- Create: `plugins/edolas-telemetry/src/main/resources/plugin.yml`
- Create: `plugins/edolas-telemetry/src/main/resources/config.yml`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/config/TelemetryConfig.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/model/TelemetrySnapshot.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/security/RequestSigner.java`
- Create: `plugins/edolas-telemetry/src/test/java/vn/edolas/telemetry/security/RequestSignerTest.java`

**Interfaces:**
- Produces immutable `TelemetrySnapshot` records matching `schemaVersion: 1` JSON.
- Produces `TelemetryConfig.load(FileConfiguration)` with bounded defaults.
- Produces `SignedRequest RequestSigner.sign(serverId, secret, timestamp, nonce, rawBody)`.

- [ ] **Step 1: Scaffold Gradle and write failing signer/config tests**

Use Java toolchain/release 21, JUnit 5 and Gson. Shade/relocate Gson so the JAR has no runtime dependency collision, set the shaded archive classifier to an empty string, and disable the unshaded deployable artifact so the final filename is exactly `edolas-telemetry-1.0.0.jar`. Test the same canonical vector used by TypeScript:

```java
assertEquals("v1\nsurvival-01\n1786636800\nabc123\n" + bodyHash, RequestSigner.canonical(...));
assertEquals(expectedHex, RequestSigner.hmacSha256(secret, canonical));
```

- [ ] **Step 2: Generate wrapper and confirm RED**

Run from plugin directory:

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.10'
gradle wrapper --gradle-version 8.10.2
.\gradlew.bat test
```

Expected: tests fail because signer/config/model implementations are incomplete.

- [ ] **Step 3: Implement config, records and signer**

Validate endpoint HTTPS except localhost, ID/group syntax, key length, interval 5-60, timeouts and allowlist normalization. Never expose the secret from `toString`. Build manifest with main class `vn.edolas.telemetry.EdolasTelemetryPlugin` and `api-version: '1.21'`.

- [ ] **Step 4: Confirm plugin unit tests GREEN**

Run: `.\gradlew.bat test`

Expected: signer output exactly matches TypeScript vector and config bounds pass.

- [ ] **Step 5: Verification checkpoint**

Run: `.\gradlew.bat clean test jar`

Expected: Java 21 class files and a plugin JAR are produced.

### Task 8: Async Transport, Backoff and Paper Collector

**Files:**
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/transport/TelemetryTransport.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/transport/TelemetrySender.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/collector/PaperSnapshotCollector.java`
- Create: `plugins/edolas-telemetry/src/main/java/vn/edolas/telemetry/EdolasTelemetryPlugin.java`
- Create: `plugins/edolas-telemetry/src/test/java/vn/edolas/telemetry/transport/TelemetrySenderTest.java`
- Create: `plugins/edolas-telemetry/src/test/java/vn/edolas/telemetry/model/TelemetrySnapshotJsonTest.java`

**Interfaces:**
- `PaperSnapshotCollector.collect(): TelemetrySnapshot` runs only on Paper server thread.
- `TelemetrySender.submit(TelemetrySnapshot): boolean` is non-blocking and enforces one in-flight request.
- `TelemetrySender.close()` cancels work and shuts down its executor.

- [ ] **Step 1: Write failing transport and JSON tests**

```java
assertTrue(sender.submit(snapshot));
assertFalse(sender.submit(snapshot));
transport.complete(202);
assertTrue(sender.submit(snapshot));
assertEquals(1, transport.maxConcurrentRequests());
```

Assert 5xx/network errors increase bounded jittered backoff, 2xx resets it, 4xx does not retry stale payloads, and serialized JSON matches the TypeScript schema.

- [ ] **Step 2: Run plugin tests and confirm RED**

Run: `.\gradlew.bat test`

Expected: transport/collector/plugin classes are missing.

- [ ] **Step 3: Implement sender and Paper lifecycle**

The Bukkit repeating task only calls `collector.collect()` and `sender.submit(snapshot)`. A dedicated single-thread executor performs Gson serialization, SHA-256/HMAC, nonce generation and `HttpClient.sendAsync`. Use JVM uptime from `ManagementFactory`, Paper TPS/MSPT APIs, runtime memory, world chunk counts, player UUID/name/ping/world and critical-plugin allowlist health.

On disable: cancel Bukkit task, close sender, cancel pending future and wait no longer than one second. Log only connectivity state transitions and never log key/body/player list.

- [ ] **Step 4: Confirm all plugin tests GREEN**

Run: `.\gradlew.bat clean test`

Expected: signer, serialization, one-in-flight and backoff tests pass.

- [ ] **Step 5: Build and inspect distributable JAR**

Run:

```powershell
.\gradlew.bat shadowJar
jar tf build\libs\edolas-telemetry-1.0.0.jar | Select-String 'plugin.yml|config.yml|EdolasTelemetryPlugin|libs/gson'
```

Expected: one deployable JAR contains manifest, default config, plugin main class and relocated Gson.

### Task 9: End-to-End Verification and Operator Documentation

**Files:**
- Create: `plugins/edolas-telemetry/README.md`
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docs/superpowers/plans/2026-08-13-paper-telemetry-network-implementation.md` checkboxes only as tasks complete

**Interfaces:**
- Documents exact website migration, key generation, plugin config, build and deployment commands.
- Produces final JAR at `plugins/edolas-telemetry/build/libs/edolas-telemetry-1.0.0.jar`.

- [ ] **Step 1: Document secure setup without real secrets**

Include PowerShell key generation using 32 random bytes, mapping the generated key into `MINECRAFT_TELEMETRY_KEYS`, matching `server-id` in `config.yml`, running `npm run db:migrate:minecraft`, and installing the JAR. Do not read or copy values from `.env.owner-login`.

- [ ] **Step 2: Run complete website verification**

Run:

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Run complete plugin verification with Java 21**

Run:

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.10'
Set-Location plugins\edolas-telemetry
.\gradlew.bat clean test shadowJar
```

Expected: Gradle exits 0 and creates the deployable JAR.

- [ ] **Step 4: Apply migration against configured local MySQL**

Run from repository root: `npm run db:migrate:minecraft`

Expected: `Minecraft telemetry migration applied successfully.` Run it a second time and expect the same result to prove replay safety.

- [ ] **Step 5: Security and privacy smoke check**

Start website, submit one correctly signed fixture and verify public `/api/minecraft/status` contains only aggregate fields. Submit bad signature, expired timestamp and repeated nonce; expect 401, 401 and 409. Open `/control/minecraft` as Owner/Admin and confirm detailed data; confirm Staff receives 403/redirect.

## Primary References

- Paper project setup: https://docs.papermc.io/paper/dev/project-setup/
- Paper `plugin.yml`: https://docs.papermc.io/paper/dev/plugin-yml/
- Paper scheduler thread-safety guidance: https://docs.papermc.io/paper/dev/scheduler/
- Paper Java compatibility table: https://docs.papermc.io/paper/getting-started/
