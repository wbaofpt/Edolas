import { applyControlMigration } from "../lib/control/schema.ts";
import { getPool } from "../lib/db.ts";

const pool = getPool();
try {
  await applyControlMigration(pool);
  console.log("Secure control migration applied successfully.");
} finally {
  await pool.end();
}
