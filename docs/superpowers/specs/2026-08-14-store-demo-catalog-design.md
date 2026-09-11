# Store Demo Catalog Design

## Goal

Replace the current store catalog with a polished demonstration catalog for the existing `op-skyblock` Minecraft cluster so the new image-led storefront can be evaluated immediately.

## Scope

- Delete all rows from `store_packages` and `store_categories`.
- Preserve `store_orders` and `store_command_deliveries`; existing order snapshots remain intact and their nullable `package_id` may be cleared by the existing foreign key.
- Create five active categories: `hot-items`, `ranks`, `items`, `battle-pass`, and `monthly`.
- Create eight active packages assigned to `op-skyblock` with varied prices, accents, badges, featured state, descriptions, and existing Minecraft artwork.
- Reuse files under `/uploads/game-modes/`; do not copy or delete shared images.
- Use a harmless one-line `say` command template for every demo package. Administrators must replace it with the intended delivery command before accepting real payments.
- Do not create fake users, orders, payment records, fulfilled deliveries, or sales counts.

## Data Safety

The seed must first confirm that `op-skyblock` exists in `minecraft_servers`. Catalog deletion and insertion run in one database transaction. Any missing cluster or SQL error rolls the transaction back. The implementation must never delete from order or delivery tables.

## Interfaces

`replaceStoreWithDemoCatalog(db, groupKey?)` owns the transaction and returns category/package counts. A thin CLI script obtains the shared MySQL pool, invokes the function for `op-skyblock`, reports counts, and closes the pool.

## Verification

- Unit tests verify five unique categories, eight unique packages, safe commands, valid image paths, and the target cluster.
- Transaction tests verify replacement order, preserved order tables, commit on success, and rollback before deletion when the cluster is absent.
- After implementation, run the CLI against the configured MySQL database and query inserted rows.
- Run the complete project test suite, TypeScript, and ESLint.

