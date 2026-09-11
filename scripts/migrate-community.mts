import { getPool } from "../lib/db.ts";
import { applyCommunityMigration } from "../lib/community/schema.ts";

const pool = getPool();
try {
  await applyCommunityMigration(pool);
  console.log("Community migration applied successfully.");
} finally {
  await pool.end();
}

