# Wiki Media and Reader Presence Design

## Goal

Allow staff to upload and insert images, GIFs, and videos inside Wiki articles while showing total opens, unique readers, and readers active in the last 60 seconds.

## Media

- Staff can upload JPG, PNG, WebP, or GIF files up to 10 MB and MP4 or WebM files up to 50 MB.
- Files are identified by magic bytes, not filename or browser MIME type.
- Files are stored under `public/uploads/wiki` with random names; MySQL stores metadata in `wiki_media`.
- The editor inserts a controlled token at the textarea cursor: `[[image:/uploads/wiki/file.webp|Caption]]`, `[[gif:...]]`, or `[[video:...]]`.
- The public renderer accepts only those three token types and paths rooted at `/uploads/wiki/`. Text is rendered as React text, never raw HTML.
- Uploaded media is previewed in the editor before saving the article.

## Reader Metrics

- `wiki_page_readers` stores one row per article and reader identity with open count, first open, last open, and last heartbeat.
- Signed-in readers are identified by user ID. Anonymous readers receive a random HttpOnly `edolas_wiki_visitor` cookie; only a SHA-256 identity hash is stored.
- Opening an article increments total opens and upserts the unique reader.
- A client heartbeat runs every 30 seconds while the page is visible.
- `Đang đọc` counts identities whose heartbeat is newer than 60 seconds.
- The article header shows total opens, unique readers, and active readers. Metrics update after the initial open and each heartbeat.

## Security and Operations

- Upload is staff-only at the server route.
- Media metadata is written only after the file succeeds; a database failure removes the new file.
- Reader routes accept only positive article IDs and record metrics only for published articles.
- Migration is additive, replay-safe, and uses cascading foreign keys.

## Verification

- Tests cover file signatures and limits, safe token parsing, staff upload authorization, reader identity hashing, open/heartbeat behavior, and UI contracts.
- Final gates: full tests, TypeScript, lint, production build, and replaying the live MySQL migration.

