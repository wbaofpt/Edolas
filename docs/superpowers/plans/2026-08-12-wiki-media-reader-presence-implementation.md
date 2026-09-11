# Wiki Media and Reader Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe inline Wiki media uploads and durable plus live reader metrics.

**Architecture:** Add replay-safe media/reader tables, focused media and reader service modules, staff-only upload and public read-event routes, then integrate controlled media tokens into the existing editor and public article renderer.

**Tech Stack:** Next.js 14, React 18, TypeScript, MySQL/mysql2, Node filesystem/crypto, existing Tailwind CSS.

## Global Constraints

- Images/GIFs: 10 MB maximum. MP4/WebM: 50 MB maximum.
- Store files on the self-hosted VPS under `public/uploads/wiki`.
- Never render raw Wiki HTML or trust client MIME types.
- Presence expires after 60 seconds and heartbeats run every 30 seconds.
- Do not add dependencies.

---

### Task 1: Replay-safe Schema

**Files:** Create `database/05_wiki_media_readers.sql`, `lib/wiki/media-reader-schema.ts`, `scripts/migrate-wiki-media-readers.mts`; modify canonical schema and package script; test `tests/wiki-media-reader-schema.test.mts`.

- [ ] Write failing schema contracts for `wiki_media`, `wiki_page_readers`, primary/index/foreign keys.
- [ ] Implement replay-safe table creation and migration runner.
- [ ] Run schema tests and apply migration twice to local MySQL.

### Task 2: Safe Media Upload and Tokens

**Files:** Create `lib/wiki/media.ts`, `lib/wiki/content.ts`, `lib/wiki/media-http.ts`, `app/api/wiki/media/route.ts`; test media validation, parser, and HTTP authorization.

- [ ] Write failing tests for signatures, limits, safe paths, token parsing, and staff-only upload.
- [ ] Implement validators, metadata insert, filesystem write/rollback, and route.
- [ ] Run focused tests.

### Task 3: Reader Metrics

**Files:** Create `lib/wiki/readers.ts`, `lib/wiki/readers-http.ts`, `app/api/wiki/pages/[id]/read/route.ts`; modify Wiki service detail DTO; test open, heartbeat, cookie identity, and 60-second active query.

- [ ] Write failing service and HTTP tests.
- [ ] Implement identity hashing, open/heartbeat upserts, metrics query, and anonymous cookie.
- [ ] Run focused tests.

### Task 4: Editor and Public Reader UI

**Files:** Create media uploader/preview/content/reader tracker components; modify article editor, article page, and CSS; test UI contracts.

- [ ] Write failing contracts for toolbar controls, cursor insertion, preview, safe renderer, heartbeat, and three metrics.
- [ ] Implement focused components and wire them to existing pages.
- [ ] Run focused tests, then full test/TypeScript/lint/build gates.

