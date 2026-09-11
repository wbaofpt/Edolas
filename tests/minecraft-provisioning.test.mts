import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  parseMinecraftProvisionArgs,
  provisionMinecraftServer,
} from "../lib/minecraft/provisioning.ts";

const existingKey = "a".repeat(32);
const source = [
  'DATABASE_URL="mysql://localhost/edolas"',
  `MINECRAFT_TELEMETRY_KEYS='{"survival-01":"${existingKey}"}'`,
  `MINECRAFT_TELEMETRY_GROUPS='{"survival-01":"survival"}'`,
  "UNRELATED=value",
  "",
].join("\r\n");

const input = {
  serverId: "survival-02",
  group: "survival",
  displayName: "Survival 02",
  endpoint: "https://edolas.example/api/minecraft/telemetry",
  dryRun: false,
};

test("provisioning adds one independent backend while preserving the environment", () => {
  const result = provisionMinecraftServer(input, source, () =>
    Buffer.alloc(32, 7),
  );
  assert.match(result.envText, /DATABASE_URL="mysql:\/\/localhost\/edolas"/);
  assert.match(result.envText, /UNRELATED=value/);
  assert.match(result.envText, /survival-01/);
  assert.match(result.envText, /survival-02/);
  assert.match(result.envText, /MINECRAFT_TELEMETRY_GROUPS/);
  assert.match(result.envText, /"survival-02":"survival"/);
  assert.match(result.configYaml, /server-id: "survival-02"/);
  assert.match(result.configYaml, /group: "survival"/);
  assert.match(
    result.configYaml,
    /endpoint: "https:\/\/edolas\.example\/api\/minecraft\/telemetry"/,
  );
  assert.match(
    result.configYaml,
    /delivery-endpoint: "https:\/\/edolas\.example\/api\/minecraft\/deliveries"/,
  );
  assert.match(
    result.configYaml,
    new RegExp(`api-key: "${Buffer.alloc(32, 7).toString("base64")}"`),
  );
  assert.equal(result.serverId, "survival-02");
});

test("provisioning rejects duplicate IDs and unsafe configuration", () => {
  assert.throws(
    () =>
      provisionMinecraftServer({ ...input, serverId: "survival-01" }, source),
    /already exists/,
  );
  assert.throws(
    () => provisionMinecraftServer({ ...input, serverId: "Bad ID" }, source),
    /server-id/,
  );
  assert.throws(
    () => provisionMinecraftServer({ ...input, group: "Bad Group" }, source),
    /group/,
  );
  assert.throws(
    () =>
      provisionMinecraftServer(
        { ...input, endpoint: "http://remote.example/api/minecraft/telemetry" },
        source,
      ),
    /HTTPS/,
  );
  assert.doesNotThrow(() =>
    provisionMinecraftServer(
      { ...input, endpoint: "http://127.0.0.1:3000/api/minecraft/telemetry" },
      source,
    ),
  );
  assert.throws(
    () =>
      provisionMinecraftServer(input, "MINECRAFT_TELEMETRY_KEYS='not-json'\n"),
    /valid JSON/,
  );
  assert.throws(
    () =>
      provisionMinecraftServer(
        input,
        `${source}MINECRAFT_TELEMETRY_KEYS='{}'\n`,
      ),
    /exactly once/,
  );
});

test("CLI parser requires explicit values and supports dry run", () => {
  assert.deepEqual(
    parseMinecraftProvisionArgs([
      "--id",
      "skyblock-01",
      "--group",
      "op-skyblock",
      "--name",
      "OP Skyblock 01",
      "--endpoint",
      "https://edolas.example/api/minecraft/telemetry",
      "--dry-run",
    ]),
    {
      serverId: "skyblock-01",
      group: "op-skyblock",
      displayName: "OP Skyblock 01",
      endpoint: "https://edolas.example/api/minecraft/telemetry",
      dryRun: true,
    },
  );
  assert.throws(
    () => parseMinecraftProvisionArgs(["--id", "missing-fields"]),
    /required/,
  );
});

test("CLI guards environment writes during dry run", async () => {
  const sourceCode = await readFile(
    new URL("../scripts/add-minecraft-server.mts", import.meta.url),
    "utf8",
  );
  assert.match(sourceCode, /if \(!input\.dryRun\)/);
  assert.match(sourceCode, /rename/);

  const directory = await mkdtemp(join(tmpdir(), "edolas-provision-"));
  const envPath = join(directory, ".env");
  await writeFile(envPath, source, "utf8");
  try {
    await promisify(execFile)(
      process.execPath,
      [
        "--experimental-strip-types",
        fileURLToPath(
          new URL("../scripts/add-minecraft-server.mts", import.meta.url),
        ),
        "--id",
        "dry-run-01",
        "--group",
        "survival",
        "--name",
        "Dry Run 01",
        "--endpoint",
        "https://edolas.example/api/minecraft/telemetry",
        "--dry-run",
      ],
      { cwd: directory },
    );
    assert.equal(await readFile(envPath, "utf8"), source);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
