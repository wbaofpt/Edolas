import { getPool } from "../lib/db.ts";
import { applyWikiMediaReaderMigration } from "../lib/wiki/media-reader-schema.ts";

const pool = getPool();
try {
  await applyWikiMediaReaderMigration(pool);
  console.log("Wiki media-reader migration applied successfully.");
} finally {
  await pool.end();
}

