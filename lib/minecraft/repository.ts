import { createHash } from "node:crypto";
import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";
import type { TelemetrySnapshot } from "./types.ts";

type TelemetryDb = Pick<Pool, "getConnection">;

export class ReplayTelemetryError extends Error {
  constructor() {
    super("Telemetry nonce has already been used.");
    this.name = "ReplayTelemetryError";
  }
}

export class RateLimitedTelemetryError extends Error {
  constructor() {
    super("Telemetry snapshots must be at least three seconds apart.");
    this.name = "RateLimitedTelemetryError";
  }
}

function isDuplicateEntry(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY");
}

export async function saveTelemetrySnapshot(
  input: { serverId: string; nonce: string; snapshot: TelemetrySnapshot; now: Date },
  deps: { db?: TelemetryDb } = {}
) {
  const db = deps.db ?? getPool();
  const connection = await db.getConnection();
  const { serverId, nonce, snapshot, now } = input;

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO minecraft_servers (
        server_id, group_key, display_name, minecraft_version, paper_version,
        worlds_json, plugin_health_json, reported_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE server_id=VALUES(server_id)`,
      [
        serverId,
        snapshot.server.group,
        snapshot.server.displayName,
        snapshot.server.minecraftVersion,
        snapshot.server.paperVersion,
        JSON.stringify([]),
        JSON.stringify([]),
        new Date(snapshot.reportedAt),
        new Date("1970-01-01T00:00:01.000Z")
      ]
    );

    const nonceHash = createHash("sha256").update(nonce, "utf8").digest("hex");
    try {
      await connection.execute(
        "INSERT INTO minecraft_telemetry_nonces (server_id,nonce_hash,expires_at) VALUES (?,?,?)",
        [serverId, nonceHash, new Date(now.getTime() + 120_000)]
      );
    } catch (error) {
      if (isDuplicateEntry(error)) throw new ReplayTelemetryError();
      throw error;
    }

    const [rows] = await connection.query(
      "SELECT last_seen_at FROM minecraft_servers WHERE server_id=? FOR UPDATE",
      [serverId]
    ) as [Array<{ last_seen_at: Date | string }>, unknown];
    const lastSeen = rows[0] ? new Date(rows[0].last_seen_at).getTime() : 0;
    if (Number.isFinite(lastSeen) && now.getTime() - lastSeen < 3_000) throw new RateLimitedTelemetryError();

    await connection.execute(
      `UPDATE minecraft_servers SET
        group_key=?, display_name=?, minecraft_version=?, paper_version=?,
        online_players=?, max_players=?, tps_1m=?, tps_5m=?, tps_15m=?, mspt=?,
        memory_used_bytes=?, memory_max_bytes=?, uptime_seconds=?, worlds_json=?,
        plugin_health_json=?, reported_at=?, last_seen_at=?
      WHERE server_id=?`,
      [
        snapshot.server.group,
        snapshot.server.displayName,
        snapshot.server.minecraftVersion,
        snapshot.server.paperVersion,
        snapshot.capacity.online,
        snapshot.capacity.max,
        snapshot.performance.tps1m,
        snapshot.performance.tps5m,
        snapshot.performance.tps15m,
        snapshot.performance.mspt,
        snapshot.performance.memoryUsedBytes,
        snapshot.performance.memoryMaxBytes,
        snapshot.server.uptimeSeconds,
        JSON.stringify(snapshot.worlds),
        JSON.stringify(snapshot.pluginHealth),
        new Date(snapshot.reportedAt),
        now,
        serverId
      ]
    );

    await connection.execute("DELETE FROM minecraft_online_players WHERE server_id=?", [serverId]);
    if (snapshot.players.length > 0) {
      const placeholders = snapshot.players.map(() => "(?,?,?,?,?,?)").join(",");
      const values = snapshot.players.flatMap((player) => [serverId, player.uuid, player.username, player.ping, player.world, now]);
      await connection.execute(
        `INSERT INTO minecraft_online_players (server_id,player_uuid,username,ping,world_name,observed_at) VALUES ${placeholders}`,
        values
      );
    }

    await connection.execute("DELETE FROM minecraft_telemetry_nonces WHERE expires_at < ?", [now]);
    await connection.commit();
    return { acceptedAt: now };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
