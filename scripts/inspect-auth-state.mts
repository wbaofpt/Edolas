import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getPool } from "../lib/db.ts";
import { collectAuthAudit, formatAuthAuditReport } from "../lib/auth/audit.ts";

const pool = getPool();
const outputPath = join("docs", "superpowers", "reports", "2026-08-11-auth-data-audit.md");

try {
  const report = await collectAuthAudit(pool);
  const markdown = formatAuthAuditReport(report);
  await mkdir(join("docs", "superpowers", "reports"), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
  console.log(`Auth audit written to ${outputPath}`);
  console.log(markdown);
} finally {
  await pool.end();
}
