# Community Profile, Forum and Wiki Design

## Goal

Build a database-backed community layer for EdolasSG: public member profiles with local avatar uploads and social stats, a usable forum whose posts and likes drive those stats, and a clustered Wiki with staff administration.

## Scope

### Profile

- Public route: `/profile/[username]`.
- The owner can update display name, biography, and upload a JPG, PNG, or WebP avatar up to 3 MB.
- Avatar files are stored under `public/uploads/avatars`; MySQL stores only the generated public path.
- Other signed-in users can follow or unfollow the profile. Self-follow and duplicate follows are rejected by both service validation and database constraints.
- Statistics are calculated from MySQL: authored topics, likes received on authored topics, followers, and following.
- The profile shows authored topics. The owner additionally sees liked topics.
- The header account menu links to the current user's profile.

### Forum

- `/forum` lists database categories and recent topics.
- `/forum/new` lets an authenticated user create a topic in a valid category.
- `/forum/[id]` displays the topic and allows authenticated users to like or unlike it.
- Counts are database-derived. Static sample topics are removed from the page data flow.
- Empty, loading, permission, validation, and database failure states use clear Vietnamese messages.

### Wiki

- `/wiki` displays published pages grouped by selectable clusters.
- Selecting a cluster is represented by `?cluster=<slug>` so it can be bookmarked and shared.
- `/wiki/[slug]` displays one published article.
- `/wiki/admin` is restricted to `role_name = staff` and supports creating, editing, publishing/hiding, ordering, and deleting clusters and pages.
- Wiki content is plain text with preserved paragraphs. Raw HTML is not accepted or rendered.

## Data Model

- Extend `users` with nullable `bio VARCHAR(500)`.
- `user_follows(follower_id, followed_id, created_at)` uses a composite primary key and cascading foreign keys.
- Extend `forum_topics` with `created_at` and `views_count`.
- `forum_topic_likes(topic_id, user_id, created_at)` uses a composite primary key.
- `wiki_clusters(id, slug, name, description, accent, sort_order, created_at, updated_at)`.
- Extend `wiki_pages` with `cluster_id`, `author_id`, `is_published`, `sort_order`, `created_at`, and `updated_at`; retain `section_name` for compatibility with existing rows.
- Migration `database/04_community.sql` is additive and preserves existing content.

## Architecture

- `lib/profile/*`, `lib/forum/*`, and `lib/wiki/*` own validation and database operations.
- Route handlers translate HTTP input/output, resolve the session cookie, and enforce authentication or staff authorization.
- Client components own forms, optimistic interaction feedback, and router refreshes; they never decide authorization.
- Server pages load initial data directly from services and degrade to explicit unavailable states if MySQL cannot be reached.

## Interface Direction

- Preserve the existing electric sapphire palette and pixel identity while using a more content-focused layout.
- Profile uses a cinematic cover, overlapping energy-ring avatar, compact statistic rail, identity/bio panel, and activity tabs.
- Forum uses a command-board layout with category rail and readable topic rows rather than decorative cards for every item.
- Wiki uses a left cluster navigator on desktop, horizontal cluster controls on mobile, and a reading canvas with strong hierarchy.
- Motion is limited to entrance sequencing, tab transitions, counters, upload state, and feedback. Every effect respects `prefers-reduced-motion`.
- Controls have visible labels, keyboard focus, at least 44 px touch targets, accessible status messages, and non-color-only selected states.

## Security and Errors

- Uploaded files are checked by size and magic bytes, assigned random names, and never use the client filename as a path.
- Profile updates have bounded lengths. Topic and Wiki inputs are validated and parameterized.
- Mutations require a valid unexpired session; Wiki administration additionally requires staff.
- File write failures do not update MySQL. Replaced local avatars are removed only after the database update succeeds.
- `.env.example` contains placeholders only; the exposed Gmail App Password must be revoked outside the repository.

## Verification

- Unit tests cover validators, profile statistics/follow behavior, forum create/like behavior, Wiki grouping/staff authorization helpers, and upload file validation.
- HTTP tests cover unauthenticated and unauthorized mutations.
- UI contract tests cover the profile link, upload affordance, cluster selector, and Wiki admin route.
- Final gates: `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

