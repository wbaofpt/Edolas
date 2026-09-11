# Wiki Admin Library Redesign

## Goal

Make Wiki administration easy to scan and operate as content grows, without changing the existing MySQL schema or public Wiki routes.

## Information Architecture

- `/wiki/admin` opens the article library by default.
- The top navigation has two explicit tabs: `Bài viết` and `Cụm Wiki`.
- The article tab provides search, cluster filtering, publication filtering, summary counts, and a responsive list.
- `/wiki/admin/new` contains the create form on its own page.
- `/wiki/admin/[id]` contains the edit form on its own page.
- The cluster tab uses a compact list. Only the selected cluster or the create action opens an editor.

## Article Library

- Each row shows title, slug, cluster, published/draft state, order, and last update.
- Actions are `Xem`, `Sửa`, and `Xóa`; hidden articles do not offer a public view link.
- Filters use URL query parameters so browser history, refresh, and shared admin links preserve state.
- On narrow screens, rows become stacked cards without horizontal scrolling.
- Deletion requires an accessible confirmation dialog naming the article.

## Editor

- Every field has a visible label and short helper text where the value is technical.
- Primary content fields occupy the wide main column; publication, cluster, slug, and ordering live in a supporting side panel.
- Create and edit share one focused component but call the existing POST/PATCH APIs.
- Save feedback is announced through `aria-live`; successful creation routes to the edit page, successful editing refreshes current data.
- The edit page includes a public preview link only while published.

## Cluster Management

- The default state is a readable cluster list with article count, accent, slug, and order.
- `Tạo cụm` opens one empty editor; `Sửa` opens one selected editor.
- Cancel closes the editor without mutation.
- Deletion requires confirmation and keeps the existing server rule that non-empty clusters cannot be deleted.

## Data and Security

- `listAllWikiPages(filters)` accepts optional query, cluster ID, and publication state.
- `getWikiAdminPageById(id)` returns one article including its body for staff editing.
- Server pages continue to redirect anonymous users to login and non-staff users to the public Wiki.
- Existing staff-only mutation routes remain the authorization boundary.

## Verification

- Service tests cover filtering parameters and fetching an article by ID.
- UI contract tests cover separate create/edit routes, visible labels, filters, tabs, and deletion confirmation.
- Final gates are `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

