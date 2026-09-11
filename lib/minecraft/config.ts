export const MINECRAFT_SERVER_ID_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function parseTelemetryKeys(
  env: Record<string, string | undefined> = process.env,
) {
  const source = env.MINECRAFT_TELEMETRY_KEYS?.trim();
  if (!source)
    throw new Error(
      "MINECRAFT_TELEMETRY_KEYS must define at least one server.",
    );

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("MINECRAFT_TELEMETRY_KEYS must be a valid JSON object.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MINECRAFT_TELEMETRY_KEYS must be a JSON object.");
  }

  const keys = new Map<string, Buffer>();
  for (const [serverId, value] of Object.entries(parsed)) {
    if (!MINECRAFT_SERVER_ID_PATTERN.test(serverId))
      throw new Error(`Invalid telemetry server id: ${serverId}`);
    if (typeof value !== "string" || Buffer.byteLength(value, "utf8") < 32) {
      throw new Error(
        `Telemetry key for ${serverId} must contain at least 32 bytes.`,
      );
    }
    keys.set(serverId, Buffer.from(value, "utf8"));
  }

  if (keys.size === 0)
    throw new Error(
      "MINECRAFT_TELEMETRY_KEYS must define at least one server.",
    );
  return keys as ReadonlyMap<string, Buffer>;
}

export function parseTelemetryGroups(
  env: Record<string, string | undefined> = process.env,
) {
  const source = env.MINECRAFT_TELEMETRY_GROUPS?.trim();
  if (!source) {
    throw new Error(
      "MINECRAFT_TELEMETRY_GROUPS must define every telemetry server.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("MINECRAFT_TELEMETRY_GROUPS must be a valid JSON object.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MINECRAFT_TELEMETRY_GROUPS must be a JSON object.");
  }

  const groups = new Map<string, string>();
  for (const [serverId, value] of Object.entries(parsed)) {
    if (!MINECRAFT_SERVER_ID_PATTERN.test(serverId)) {
      throw new Error(`Invalid telemetry server id: ${serverId}`);
    }
    if (typeof value !== "string" || !MINECRAFT_SERVER_ID_PATTERN.test(value)) {
      throw new Error(`Telemetry group for ${serverId} is invalid.`);
    }
    groups.set(serverId, value);
  }
  if (groups.size === 0) {
    throw new Error(
      "MINECRAFT_TELEMETRY_GROUPS must define every telemetry server.",
    );
  }
  return groups as ReadonlyMap<string, string>;
}
