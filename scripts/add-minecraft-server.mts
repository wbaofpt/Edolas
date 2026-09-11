import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseMinecraftProvisionArgs, provisionMinecraftServer } from "../lib/minecraft/provisioning.ts";

const envPath = join(process.cwd(), ".env");
const temporaryPath = `${envPath}.${process.pid}.tmp`;

try {
  const input = parseMinecraftProvisionArgs(process.argv.slice(2));
  const envText = await readFile(envPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const result = provisionMinecraftServer(input, envText);
  if (!input.dryRun) {
    await writeFile(temporaryPath, result.envText, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, envPath);
  }
  process.stdout.write(`${input.dryRun ? "DRY RUN - .env was not changed.\n" : `.env updated for ${result.serverId}.\n`}The config below contains a secret. Paste it only into the matching Paper backend:\n\n${result.configYaml}`);
} catch (error) {
  await unlink(temporaryPath).catch(() => undefined);
  const message = error instanceof Error ? error.message : "Minecraft server provisioning failed.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
