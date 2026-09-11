import { getPool } from "../lib/db.ts";
import { replaceStoreWithDemoCatalog } from "../lib/store/demo-seed.ts";

const pool = getPool();
try {
  const result = await replaceStoreWithDemoCatalog(pool, "op-skyblock");
  console.log(
    `Demo store seeded: ${result.categories} categories, ${result.packages} packages for ${result.groupKey}.`,
  );
} finally {
  await pool.end();
}

