import { randomBytes } from "node:crypto";
import { MINECRAFT_SERVER_ID_PATTERN } from "./config.ts";

export type MinecraftProvisionInput = {
  serverId: string;
  group: string;
  displayName: string;
  endpoint: string;
  dryRun: boolean;
};

export type MinecraftProvisionResult = {
  envText: string;
  configYaml: string;
  serverId: string;
};

function required(value: string, field: string, max: number) {
  const result = value.trim();
  if (!result || result.length > max)
    throw new Error(
      `${field} is required and must not exceed ${max} characters.`,
    );
  return result;
}

function identifier(value: string, field: string) {
  const result = required(value, field, 40);
  if (!MINECRAFT_SERVER_ID_PATTERN.test(result))
    throw new Error(`${field} is invalid.`);
  return result;
}

function telemetryEndpoint(value: string) {
  const source = required(value, "endpoint", 2048);
  let endpoint: URL;
  try {
    endpoint = new URL(source);
  } catch {
    throw new Error("endpoint is invalid.");
  }
  const local =
    endpoint.hostname === "localhost" ||
    endpoint.hostname === "127.0.0.1" ||
    endpoint.hostname === "[::1]";
  if (
    endpoint.protocol !== "https:" &&
    !(local && endpoint.protocol === "http:")
  ) {
    throw new Error("endpoint must use HTTPS outside localhost.");
  }
  return endpoint.toString();
}

function parseKeyMap(envText: string) {
  const assignments =
    envText.match(/^MINECRAFT_TELEMETRY_KEYS=[^\r\n]*/gm) ?? [];
  if (assignments.length > 1)
    throw new Error(
      "MINECRAFT_TELEMETRY_KEYS must appear exactly once in .env.",
    );
  const match = assignments[0]?.match(/^MINECRAFT_TELEMETRY_KEYS=([^\r\n]*)/);
  if (!match) return {} as Record<string, string>;
  let source = match[1].trim();
  if (
    (source.startsWith("'") && source.endsWith("'")) ||
    (source.startsWith('"') && source.endsWith('"'))
  ) {
    source = source.slice(1, -1);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(
      "MINECRAFT_TELEMETRY_KEYS must be valid JSON before adding a server.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MINECRAFT_TELEMETRY_KEYS must be a JSON object.");
  }
  const keys: Record<string, string> = {};
  for (const [serverId, key] of Object.entries(parsed)) {
    if (
      !MINECRAFT_SERVER_ID_PATTERN.test(serverId) ||
      typeof key !== "string" ||
      Buffer.byteLength(key, "utf8") < 32
    ) {
      throw new Error(`Existing telemetry entry ${serverId} is invalid.`);
    }
    keys[serverId] = key;
  }
  return keys;
}

function parseGroupMap(envText: string) {
  const assignments =
    envText.match(/^MINECRAFT_TELEMETRY_GROUPS=[^\r\n]*/gm) ?? [];
  if (assignments.length > 1) {
    throw new Error(
      "MINECRAFT_TELEMETRY_GROUPS must appear exactly once in .env.",
    );
  }
  const match = assignments[0]?.match(/^MINECRAFT_TELEMETRY_GROUPS=([^\r\n]*)/);
  if (!match) return {} as Record<string, string>;
  let source = match[1].trim();
  if (
    (source.startsWith("'") && source.endsWith("'")) ||
    (source.startsWith('"') && source.endsWith('"'))
  ) {
    source = source.slice(1, -1);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(
      "MINECRAFT_TELEMETRY_GROUPS must be valid JSON before adding a server.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MINECRAFT_TELEMETRY_GROUPS must be a JSON object.");
  }
  const groups: Record<string, string> = {};
  for (const [serverId, group] of Object.entries(parsed)) {
    if (
      !MINECRAFT_SERVER_ID_PATTERN.test(serverId) ||
      typeof group !== "string" ||
      !MINECRAFT_SERVER_ID_PATTERN.test(group)
    ) {
      throw new Error(`Existing telemetry group ${serverId} is invalid.`);
    }
    groups[serverId] = group;
  }
  return groups;
}

function updateKeyAssignment(envText: string, keys: Record<string, string>) {
  const assignment = `MINECRAFT_TELEMETRY_KEYS='${JSON.stringify(keys)}'`;
  if (/^MINECRAFT_TELEMETRY_KEYS=/m.test(envText)) {
    return envText.replace(/^MINECRAFT_TELEMETRY_KEYS=[^\r\n]*/m, assignment);
  }
  const newline = envText.includes("\r\n") ? "\r\n" : "\n";
  const separator =
    envText.length > 0 && !envText.endsWith("\n") ? newline : "";
  return `${envText}${separator}${assignment}${newline}`;
}

function updateGroupAssignment(
  envText: string,
  groups: Record<string, string>,
) {
  const assignment = `MINECRAFT_TELEMETRY_GROUPS='${JSON.stringify(groups)}'`;
  if (/^MINECRAFT_TELEMETRY_GROUPS=/m.test(envText)) {
    return envText.replace(/^MINECRAFT_TELEMETRY_GROUPS=[^\r\n]*/m, assignment);
  }
  const newline = envText.includes("\r\n") ? "\r\n" : "\n";
  const separator =
    envText.length > 0 && !envText.endsWith("\n") ? newline : "";
  return `${envText}${separator}${assignment}${newline}`;
}

function yaml(value: string) {
  return JSON.stringify(value);
}

export function provisionMinecraftServer(
  input: MinecraftProvisionInput,
  envText: string,
  randomSource: (size: number) => Buffer = randomBytes,
): MinecraftProvisionResult {
  const serverId = identifier(input.serverId, "server-id");
  const group = identifier(input.group, "group");
  const displayName = required(input.displayName, "display-name", 80);
  const endpoint = telemetryEndpoint(input.endpoint);
  const deliveryEndpoint = new URL("./deliveries", endpoint).toString();
  const keys = parseKeyMap(envText);
  const groups = parseGroupMap(envText);
  if (Object.hasOwn(keys, serverId))
    throw new Error(`Telemetry server ${serverId} already exists.`);
  const generated = randomSource(32);
  if (generated.length !== 32)
    throw new Error("Telemetry key generator must return exactly 32 bytes.");
  const apiKey = generated.toString("base64");
  keys[serverId] = apiKey;
  groups[serverId] = group;

  const configYaml = [
    `server-id: ${yaml(serverId)}`,
    `group: ${yaml(group)}`,
    `display-name: ${yaml(displayName)}`,
    `endpoint: ${yaml(endpoint)}`,
    `delivery-endpoint: ${yaml(deliveryEndpoint)}`,
    `api-key: ${yaml(apiKey)}`,
    "interval-seconds: 10",
    "delivery-interval-seconds: 5",
    "connect-timeout-seconds: 5",
    "request-timeout-seconds: 8",
    "critical-plugins:",
    '  - "LuckPerms"',
    "",
  ].join("\n");

  return {
    envText: updateGroupAssignment(updateKeyAssignment(envText, keys), groups),
    configYaml,
    serverId,
  };
}

export function parseMinecraftProvisionArgs(
  args: string[],
): MinecraftProvisionInput {
  const values = new Map<string, string>();
  let dryRun = false;
  const allowed = new Set(["--id", "--group", "--name", "--endpoint"]);
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (!allowed.has(flag)) throw new Error(`Unknown argument: ${flag}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`A value is required for ${flag}.`);
    values.set(flag, value);
    index += 1;
  }
  for (const flag of allowed) {
    if (!values.has(flag)) throw new Error(`${flag} is required.`);
  }
  return {
    serverId: values.get("--id")!,
    group: values.get("--group")!,
    displayName: values.get("--name")!,
    endpoint: values.get("--endpoint")!,
    dryRun,
  };
}
