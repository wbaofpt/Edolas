import { getPool } from "../lib/db.ts";
import { applyAuthMigration } from "../lib/auth/schema.ts";

const pool = getPool();

try {
  await applyAuthMigration(pool);
  console.log("Auth migration applied.");
} finally {
  await pool.end();
}
