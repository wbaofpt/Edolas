import { getPool } from "../lib/db.ts";
import { applyAdminMigration } from "../lib/admin/schema.ts";

const pool = getPool();
try {
  await applyAdminMigration(pool);
  console.log("Admin control migration applied successfully.");
} finally {
  await pool.end();
}
