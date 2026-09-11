# Hybrid Store Catalog Design

**Date:** 2026-08-14
**Status:** Approved

## Goal

Transform the Edolas top-up catalog into an image-led game store inspired by the supplied reference while preserving the existing secure order approval and Paper command-delivery workflow.

## Public Experience

The character and cluster step remains first. After it is complete, desktop uses a hybrid workspace:

- The main column contains a featured package rail, category filters, and an image-led package grid.
- The side column contains the selected package, payment method, total, safety note, and checkout action.
- Only one package may be selected per order. The plus/select action replaces the current selection rather than building a multi-item cart.
- Mobile preserves the four-step flow and renders the catalog, payment, and confirmation regions in normal document order.

Each package card shows its managed image, name, short description, price, optional badge, completed-order count, and selected state. Packages without an image use a deliberate Edolas gradient placeholder rather than a broken image.

## Catalog Data

Add `store_categories` with a stable slug, display name, sort order, active state, and audit ownership fields. Extend `store_packages` with:

- nullable `category_id`, with unassigned packages displayed under `Khác`;
- nullable `image_path` restricted to the managed package-upload directory;
- nullable `badge` containing at most 20 visible characters;
- `is_featured` boolean;
- existing `sort_order` remains the package display order.

Public catalog queries include category metadata and a derived sold count from fulfilled orders. They never include command templates or administrative ownership data.

## Control Management

The Control Store gains a catalog-management area:

- Create, rename, reorder, activate, and delete categories.
- Category deletion is rejected while a package references it.
- Assign a category, badge, featured state, and display order while editing a package.
- Upload, replace, preview, and remove a package image.
- Existing package, command, order approval, and cancellation controls remain available.

All category, package metadata, and image mutations require the existing account-admin Control session and CSRF proof. Every successful mutation writes an admin audit record.

## Image Storage

- Accept valid JPG, PNG, and WebP signatures only.
- Maximum file size is 5 MB.
- Ignore client filenames and generate a random server filename.
- Store files under `public/uploads/store/packages` and expose only `/uploads/store/packages/<managed-name>` paths.
- Delete a newly written file if the database update fails.
- Delete the previous managed file after a successful replacement or removal.

## Migration

The migration remains replay-safe for existing databases:

- Create `store_categories` before adding package references.
- Add each missing package column independently after inspecting `information_schema`.
- Add indexes and the category foreign key only when absent.
- Existing packages remain valid with a null category and no image.
- Existing order rows, command snapshots, deliveries, and package IDs are unchanged.

## Interaction And Motion

- Category tabs are native buttons with `aria-pressed`.
- Package cards remain native buttons and expose selection with `aria-pressed`, an icon, border, and background.
- Card entry and selection use opacity/transform transitions between 180 and 260 ms.
- Package images reserve aspect-ratio space to avoid layout shift.
- All decorative motion is removed under `prefers-reduced-motion`.
- Desktop supports the supplied catalog-plus-summary composition; layouts collapse without horizontal page scrolling at 760 px and below.

## Error Handling

- Missing or unavailable categories do not hide unassigned packages.
- Image upload errors are shown in the package editor without discarding unsaved metadata.
- Empty category results show a clear empty state and a control to return to all packages.
- Catalog database failure continues to use the existing unavailable state.
- Checkout validation and login-resume behavior remain unchanged.

## Verification

- Test migration replay behavior and new SQL fields.
- Test category/package validation and service mappings.
- Test category authorization, referential conflict handling, and audit writes.
- Test image signatures, size limits, managed paths, cleanup, and Control authorization.
- Test Control UI source for accessible category and image controls.
- Test public source and CSS for featured rail, category tabs, image fallback, side summary, mobile flow, and reduced motion.
- Run all tests, TypeScript, ESLint, and the production build.

