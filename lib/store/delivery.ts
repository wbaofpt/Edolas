import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import { getPool } from "../db.ts";

type DeliveryDb = Pick<Pool, "getConnection">;
type Connection = Pick<
  PoolConnection,
  "beginTransaction" | "commit" | "rollback" | "release" | "query" | "execute"
>;
export class StoreDeliveryReplayError extends Error {}
export class StoreDeliveryAuthError extends Error {}
function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function duplicate(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY",
  );
}
function safeHashEqual(left: string, right: string) {
  const a = Buffer.from(left, "hex"),
    b = Buffer.from(right, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
async function nonce(
  connection: Connection,
  serverId: string,
  value: string,
  now: Date,
) {
  try {
    await connection.execute(
      "INSERT INTO minecraft_telemetry_nonces (server_id,nonce_hash,expires_at) VALUES (?,?,?)",
      [serverId, hash(value), new Date(now.getTime() + 120_000)],
    );
  } catch (error) {
    if (duplicate(error)) throw new StoreDeliveryReplayError();
    throw error;
  }
}

export async function claimStoreDelivery(
  input: {
    serverId: string;
    nonce: string;
    now: Date;
    expectedGroup: string;
  },
  db: DeliveryDb = getPool(),
) {
  const connection = (await db.getConnection()) as Connection;
  try {
    await connection.beginTransaction();
    await nonce(connection, input.serverId, input.nonce, input.now);
    const [servers] = (await connection.query(
      "SELECT group_key FROM minecraft_servers WHERE server_id=? AND group_key=? AND last_seen_at>=? LIMIT 1 FOR UPDATE",
      [
        input.serverId,
        input.expectedGroup,
        new Date(input.now.getTime() - 30_000),
      ],
    )) as [Array<{ group_key: string }>, unknown];
    if (!servers[0]) throw new StoreDeliveryAuthError();
    const [rows] = (await connection.query(
      "SELECT id,order_id,command_text FROM store_command_deliveries WHERE group_key=? AND status='pending' ORDER BY id LIMIT 1 FOR UPDATE",
      [input.expectedGroup],
    )) as [
      Array<{ id: number; order_id: number; command_text: string }>,
      unknown,
    ];
    const delivery = rows[0];
    if (!delivery) {
      await connection.commit();
      return null;
    }
    const claimToken = randomBytes(32).toString("base64url");
    await connection.execute(
      "UPDATE store_command_deliveries SET status='claimed',claimed_by_server=?,claim_token_hash=?,claimed_at=? WHERE id=? AND status='pending'",
      [input.serverId, hash(claimToken), input.now, delivery.id],
    );
    await connection.execute(
      "UPDATE store_orders SET status='delivering',updated_at=? WHERE id=? AND status='approved'",
      [input.now, delivery.order_id],
    );
    await connection.commit();
    return {
      deliveryId: Number(delivery.id),
      claimToken,
      command: delivery.command_text,
    };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

export async function completeStoreDelivery(
  input: {
    serverId: string;
    nonce: string;
    deliveryId: number;
    claimToken: string;
    success: boolean;
    output: string;
    now: Date;
  },
  db: DeliveryDb = getPool(),
) {
  const connection = (await db.getConnection()) as Connection;
  try {
    await connection.beginTransaction();
    await nonce(connection, input.serverId, input.nonce, input.now);
    const [rows] = (await connection.query(
      "SELECT id,order_id,status,claimed_by_server,claim_token_hash FROM store_command_deliveries WHERE id=? LIMIT 1 FOR UPDATE",
      [input.deliveryId],
    )) as [
      Array<{
        id: number;
        order_id: number;
        status: string;
        claimed_by_server: string | null;
        claim_token_hash: string | null;
      }>,
      unknown,
    ];
    const delivery = rows[0];
    if (
      !delivery ||
      delivery.status !== "claimed" ||
      delivery.claimed_by_server !== input.serverId ||
      !delivery.claim_token_hash ||
      !safeHashEqual(delivery.claim_token_hash, hash(input.claimToken))
    )
      throw new StoreDeliveryAuthError();
    const deliveryStatus = input.success ? "succeeded" : "failed";
    const orderStatus = input.success ? "fulfilled" : "failed";
    const output = input.output.trim().slice(0, 500) || null;
    await connection.execute(
      "UPDATE store_command_deliveries SET status=?,completed_at=?,output_summary=?,claim_token_hash=NULL WHERE id=?",
      [deliveryStatus, input.now, output, delivery.id],
    );
    await connection.execute(
      "UPDATE store_orders SET status=?,fulfilled_at=?,failure_message=?,updated_at=? WHERE id=?",
      [
        orderStatus,
        input.success ? input.now : null,
        input.success ? null : output,
        input.now,
        delivery.order_id,
      ],
    );
    await connection.commit();
    return { ok: true as const };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
