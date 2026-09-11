import { bootstrapOwner } from "../lib/admin/bootstrap.ts";
import { getPool } from "../lib/db.ts";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const email = process.env.EDOLAS_OWNER_EMAIL ?? "";
const password = process.env.EDOLAS_OWNER_PASSWORD ?? "";
const pool = getPool();
try {
  const result = await bootstrapOwner({ email, password }, pool);
  if (!result.ok) throw new Error(result.error);
  console.log("Owner credentials updated securely for edolas_admin.");
} finally {
  await pool.end();
}
