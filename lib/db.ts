import mysql from "mysql2/promise";

const globalStore = globalThis as typeof globalThis & { edolasMysqlPool?: mysql.Pool };

export function resolveDatabaseUrl(env: Record<string, string | undefined>) {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required. Configure it in the server environment.");
  return connectionString;
}

function loadLocalEnvironment() {
  if (process.env.DATABASE_URL || typeof process.loadEnvFile !== "function") return;
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function getPool() {
  if (!globalStore.edolasMysqlPool) {
    loadLocalEnvironment();
    globalStore.edolasMysqlPool = mysql.createPool({
      uri: resolveDatabaseUrl(process.env),
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }

  return globalStore.edolasMysqlPool;
}

export async function checkDatabaseConnection() {
  try {
    const [rows] = await getPool().query("SELECT 1 AS ok");
    return { ok: true, rows };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error"
    };
  }
}
