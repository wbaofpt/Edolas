# Expanded Control Center Design

## Goal

Extend `/control` from a basic administration surface into a complete operations console for EdolasSG content, forum structure, Wiki media, user sessions, and audit activity. Every visible action must operate on MySQL data and use the existing independent Control authentication boundary.

## Scope

- Dashboard metrics for pinned forum topics, draft Wiki pages, unattached media, and content approaching purge.
- Unified content operations with search, type/status filters, row selection, and bulk trash/restore.
- Forum topic operations: pin/unpin and move to another category.
- Forum category management: create, update, reorder, and delete only when empty.
- Wiki quick operations: publish/draft and move between clusters while retaining the existing full editor.
- Media operations: preview images, GIFs, and videos; show size, uploader, attached page, and unattached status.
- Session operations: list website and Control sessions and revoke sessions for manageable accounts.
- Audit filters: actor, action, target type, and date range.

The public reporting/moderation workflow is excluded because the public site has no report submission domain yet.

## Architecture

- Keep `/control` and its nested protected layout as the sole administration surface.
- Keep focused modules: `lib/admin/content-operations.ts`, `lib/admin/forum-categories.ts`, and `lib/admin/sessions.ts` own their database behavior.
- Route handlers compose existing Control origin, CSRF, session, and role guards. The client never selects table names or submits SQL identifiers.
- Bulk mutations accept at most 100 positive integer IDs and run in one MySQL transaction. Any failed item rolls back the complete operation.
- Every mutation writes an `admin_audit_logs` record in the same transaction.
- Existing Wiki editor and website resource manager remain canonical for detailed editing.

## Roles

| Capability | Staff | Admin | Owner |
| --- | --- | --- | --- |
| View content/media | Yes | Yes | Yes |
| Pin/move forum topics | Yes | Yes | Yes |
| Publish/move Wiki pages | Yes | Yes | Yes |
| Trash/restore content | Yes | Yes | Yes |
| Permanently delete | No | Yes | Yes |
| Manage forum categories | No | Yes | Yes |
| View/revoke user sessions | No | Yes | Yes |
| Manage users/settings | No | Yes | Yes |
| Manage another Admin | No | No | Yes |
| Manage Owner or self-destruct sessions | No | No | No |

## Safety Rules

- Permanent deletion requires the existing explicit confirmation phrase.
- A category with topics cannot be deleted.
- Media attached to a Wiki page cannot be permanently deleted directly.
- Account, role, lock, deactivation, and session changes retain current protected-target checks.
- Trash retention remains 30 days. No uncontrolled background deletion is introduced.
- Interactive controls have accessible labels, keyboard access, visible focus, local status feedback, and native dialog/form semantics.

## Interface

- Preserve the current dark Control Node visual language, cyan operational accent, violet secondary accent, hard borders, and pixel display headings.
- Content uses a clear toolbar, compact KPI strip, type tabs, data table, selection bar, and side/detail previews rather than adding dashboard card noise.
- Mobile layouts replace wide action rows with stacked controls while retaining table overflow for dense data.
- Motion is limited to opacity/transform feedback and respects reduced motion.

## Verification

- Parser tests for filters, IDs, dates, and exact action payloads.
- Service tests for transaction commit/rollback, permission checks, category deletion conflict, content transitions, and audit writes.
- HTTP tests for Control session and CSRF enforcement.
- UI source tests for labels, empty states, bulk controls, media preview, session controls, and audit filters.
- Full `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` before completion.
