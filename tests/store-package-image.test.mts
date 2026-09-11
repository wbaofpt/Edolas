import test from "node:test";
import assert from "node:assert/strict";
import {
  STORE_PACKAGE_IMAGE_LIMIT_BYTES,
  updateStorePackageImage,
  validateStorePackageImage,
} from "../lib/store/package-image.ts";

const actor = { id: 2, username: "admin", displayName: "Admin", roleName: "admin", avatarUrl: null };

test("store package images accept valid JPG, PNG and WebP signatures up to five MB", () => {
  assert.equal(validateStorePackageImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 4).ok, true);
  assert.equal(validateStorePackageImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 8).ok, true);
  assert.equal(validateStorePackageImage(new TextEncoder().encode("RIFF....WEBP"), 12).ok, true);
  assert.equal(validateStorePackageImage(new TextEncoder().encode("<svg></svg>"), 11).ok, false);
  assert.equal(validateStorePackageImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), STORE_PACKAGE_IMAGE_LIMIT_BYTES + 1).ok, false);
});

test("store package image update records the previous managed path", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const connection = {
    beginTransaction: async () => undefined,
    query: async () => [[{ id: 7, image_path: "/uploads/store/packages/old.webp" }], undefined],
    execute: async (sql: string, values: unknown[]) => { statements.push({ sql, values }); return [{ affectedRows: 1 }, undefined]; },
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined,
  };
  const result = await updateStorePackageImage(actor, 7, "/uploads/store/packages/new.webp", { getConnection: async () => connection } as never);
  assert.deepEqual(result, { ok: true, previousPath: "/uploads/store/packages/old.webp", imagePath: "/uploads/store/packages/new.webp" });
  assert.ok(statements.some((statement) => statement.sql.includes("UPDATE store_packages SET image_path")));
});
