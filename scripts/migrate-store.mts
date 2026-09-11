import { getPool } from "../lib/db.ts";
import { applyStoreMigration } from "../lib/store/schema.ts";

const pool = getPool();
try {
  await applyStoreMigration(pool);
  console.log("Store migration applied successfully.");
} finally {
  await pool.end();
}
