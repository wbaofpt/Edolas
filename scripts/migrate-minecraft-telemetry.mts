import { applyMinecraftTelemetryMigration } from "../lib/minecraft/schema.ts";
import { getPool } from "../lib/db.ts";

const pool = getPool();

try {
  await applyMinecraftTelemetryMigration(pool);
  console.log("Minecraft telemetry migration applied successfully.");
} finally {
  await pool.end();
}
