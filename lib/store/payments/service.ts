import { createHash } from "node:crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import type { PublicUser } from "../../auth/service.ts";
import { getPool } from "../../db.ts";
import { createStoreOrder, type PublicStoreOrder } from "../service.ts";
import { renderStoreCommand } from "../validation.ts";
import { readStorePaymentConfig, type StorePaymentConfig } from "./config.ts";
import { createMomoAdapter } from "./momo.ts";
import { createPayosAdapter } from "./payos.ts";
import { createSandboxAdapter } from "./sandbox.ts";
import type { PaymentProvider, PaymentProviderAdapter, VerifiedPayment } from "./types.ts";

type Db = Pick<Pool, "query" | "execute" | "getConnection">;
type Connection = Pick<PoolConnection, "beginTransaction" | "commit" | "rollback" | "release" | "query" | "execute">;
export type PublicPayment = {
  reference: string;
  provider: PaymentProvider;
  status: string;
  amountVnd: number;
  checkoutUrl: string | null;
  qrContent: string | null;
  expiresAt: string | null;
  orderStatus: string;
  sandboxCompletionToken?: string;
};

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

function adapterFor(method: "bank" | "momo", config: StorePaymentConfig, now: Date): PaymentProviderAdapter {
  if (config.mode === "sandbox") return createSandboxAdapter(now, config.appPublicUrl);
  if (method === "bank") {
    if (!config.payos) throw new Error("payOS is not configured.");
    return createPayosAdapter(config.payos);
  }
  if (!config.momo) throw new Error("MoMo is not configured.");
  return createMomoAdapter(config.momo);
}

function paymentFromRow(row: Record<string, unknown>): PublicPayment {
  return {
    reference: String(row.reference), provider: row.provider as PaymentProvider,
    status: String(row.status), amountVnd: Number(row.amount_vnd),
    checkoutUrl: typeof row.checkout_url === "string" ? row.checkout_url : null,
    qrContent: typeof row.qr_content === "string" ? row.qr_content : null,
    expiresAt: row.expires_at ? new Date(row.expires_at as Date | string).toISOString() : null,
    orderStatus: String(row.order_status),
  };
}

export async function getOwnedPayment(reference: string, userId: number, db: Pick<Pool, "query"> = getPool()) {
  const [rows] = await db.query(`SELECT o.reference,o.status order_status,a.provider,a.status,a.amount_vnd,a.checkout_url,a.qr_content,a.expires_at
    FROM store_orders o JOIN store_payment_attempts a ON a.order_id=o.id
    WHERE o.reference=? AND o.user_id=? ORDER BY a.id DESC LIMIT 1`, [reference, userId]) as [Array<Record<string, unknown>>, unknown];
  return rows[0] ? paymentFromRow(rows[0]) : null;
}

export async function createStoreCheckout(
  user: PublicUser,
  rawInput: unknown,
  deps: { db?: Db; config?: StorePaymentConfig; now?: Date; createOrder?: typeof createStoreOrder } = {},
): Promise<{ ok: true; order: PublicStoreOrder; payment: PublicPayment } | { ok: false; status: 400 | 404 | 409 | 503; error: string }> {
  const input = rawInput && typeof rawInput === "object" ? rawInput as Record<string, unknown> : {};
  const db = deps.db ?? getPool();
  const now = deps.now ?? new Date();
  const config = deps.config ?? readStorePaymentConfig();
  const requestKey = typeof input.clientRequestKey === "string" ? input.clientRequestKey.trim() : "";
  if (/^[A-Za-z0-9_-]{16,80}$/.test(requestKey)) {
    const [existingRows] = await db.query(`SELECT o.id,o.reference,o.package_name,o.group_key,o.minecraft_username,o.payment_method,o.price_vnd,
      o.status order_status,o.created_at,a.provider,a.status payment_status,a.amount_vnd,a.checkout_url,a.qr_content,a.expires_at
      FROM store_orders o JOIN store_payment_attempts a ON a.order_id=o.id
      WHERE o.user_id=? AND o.client_request_key=? ORDER BY a.id DESC LIMIT 1`, [user.id, requestKey]) as [Array<Record<string, unknown>>, unknown];
    const existing = existingRows[0];
    if (existing) {
      return {
        ok: true,
        order: {
          id: Number(existing.id), reference: String(existing.reference), packageName: String(existing.package_name),
          groupKey: String(existing.group_key), minecraftUsername: String(existing.minecraft_username),
          paymentMethod: existing.payment_method as "bank" | "momo", priceVnd: Number(existing.price_vnd),
          status: existing.order_status as PublicStoreOrder["status"], createdAt: new Date(existing.created_at as Date | string).toISOString(),
        },
        payment: {
          reference: String(existing.reference), provider: existing.provider as PaymentProvider,
          status: String(existing.payment_status), amountVnd: Number(existing.amount_vnd),
          checkoutUrl: typeof existing.checkout_url === "string" ? existing.checkout_url : null,
          qrContent: typeof existing.qr_content === "string" ? existing.qr_content : null,
          expiresAt: existing.expires_at ? new Date(existing.expires_at as Date | string).toISOString() : null,
          orderStatus: String(existing.order_status),
        },
      };
    }
  }
  const orderResult = await (deps.createOrder ?? createStoreOrder)(user, rawInput, { db, now });
  if (!orderResult.ok) return orderResult;
  let attemptId: number | null = null;
  try {
    const [users] = await db.query("SELECT username,email FROM users WHERE id=? LIMIT 1", [user.id]) as [Array<{ username: string; email: string }>, unknown];
    if (!users[0]) throw new Error("Account snapshot unavailable.");
    const adapter = adapterFor(orderResult.order.paymentMethod, config, now);
    const [attempt] = await db.execute(`INSERT INTO store_payment_attempts
      (order_id,provider,provider_order_id,status,amount_vnd,account_username_snapshot,account_email_snapshot,minecraft_username_snapshot)
      VALUES (?,?,?,'creating',?,?,?,?)`, [orderResult.order.id, adapter.provider, orderResult.order.reference, orderResult.order.priceVnd, users[0].username, users[0].email, orderResult.order.minecraftUsername]);
    attemptId = Number((attempt as { insertId?: number }).insertId);
    const session = await adapter.createSession({
      reference: orderResult.order.reference, amountVnd: orderResult.order.priceVnd,
      description: orderResult.order.packageName,
      returnUrl: `${config.appPublicUrl}/store?payment=${encodeURIComponent(orderResult.order.reference)}`,
      cancelUrl: `${config.appPublicUrl}/store?cancelled=${encodeURIComponent(orderResult.order.reference)}`,
    });
    await db.execute(`UPDATE store_payment_attempts SET provider_order_id=?,status='awaiting_payment',checkout_url=?,qr_content=?,sandbox_token_hash=?,expires_at=? WHERE id=?`,
      [session.providerOrderId, session.checkoutUrl, session.qrContent, session.sandboxCompletionToken ? tokenHash(session.sandboxCompletionToken) : null, session.expiresAt, attemptId]);
    return { ok: true, order: orderResult.order, payment: {
      reference: orderResult.order.reference, provider: adapter.provider, status: "awaiting_payment",
      amountVnd: orderResult.order.priceVnd, checkoutUrl: session.checkoutUrl, qrContent: session.qrContent,
      expiresAt: session.expiresAt.toISOString(), orderStatus: orderResult.order.status,
      ...(session.sandboxCompletionToken ? { sandboxCompletionToken: session.sandboxCompletionToken } : {}),
    } };
  } catch {
    if (attemptId) {
      await db.execute("UPDATE store_payment_attempts SET status='failed' WHERE id=? AND status='creating'", [attemptId]).catch(() => undefined);
    }
    await db.execute("UPDATE store_orders SET status='cancelled',failure_message='payment_session_failed' WHERE id=? AND status='pending_payment'", [orderResult.order.id]).catch(() => undefined);
    return { ok: false, status: 503, error: "Không thể khởi tạo phiên thanh toán. Vui lòng kiểm tra cấu hình cổng thanh toán." };
  }
}

async function settle(connection: Connection, provider: PaymentProvider, verified: VerifiedPayment, allowDelivery: boolean) {
  const [attempts] = await connection.query(`SELECT a.id,a.order_id,a.amount_vnd,a.status,o.command_template_snapshot,o.package_slug,o.price_vnd,o.group_key,o.minecraft_username
    FROM store_payment_attempts a JOIN store_orders o ON o.id=a.order_id
    WHERE a.provider=? AND a.provider_order_id=? LIMIT 1 FOR UPDATE`, [provider, verified.providerOrderId]) as [Array<Record<string, unknown>>, unknown];
  const attempt = attempts[0];
  const accepted = Boolean(attempt && verified.valid && verified.paid && verified.amountVnd === Number(attempt.amount_vnd));
  try {
    await connection.execute(`INSERT INTO store_payment_events
      (attempt_id,provider,event_key,event_type,signature_valid,provider_transaction_id,amount_vnd,outcome,payload_json,processed_at)
      VALUES (?,?,?,?,?,?,?,?,?,NOW(3))`, [attempt ? Number(attempt.id) : null, provider, verified.eventKey, verified.eventType, verified.valid, verified.providerTransactionId, verified.amountVnd, accepted ? "accepted" : "rejected", JSON.stringify(verified.sanitizedPayload)]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") return { ok: true as const, duplicate: true };
    throw error;
  }
  if (!accepted || !attempt) return { ok: false as const, status: 400 as const, error: "Payment verification failed." };
  if (["paid", "simulated"].includes(String(attempt.status))) return { ok: true as const, duplicate: true };
  const attemptId = Number(attempt.id);
  const orderId = Number(attempt.order_id);
  const groupKey = String(attempt.group_key);
  await connection.execute("UPDATE store_payment_attempts SET status='paid',provider_transaction_id=?,paid_at=NOW(3) WHERE id=?", [verified.providerTransactionId, attemptId]);
  if (allowDelivery) {
    const command = renderStoreCommand(String(attempt.command_template_snapshot), { player: String(attempt.minecraft_username), package: String(attempt.package_slug), amount: String(attempt.price_vnd), cluster: String(attempt.group_key) });
    await connection.execute("UPDATE store_orders SET status='approved',approved_at=NOW(3) WHERE id=? AND status='pending_payment'", [orderId]);
    await connection.execute("INSERT IGNORE INTO store_command_deliveries (order_id,group_key,command_text,status) VALUES (?,?,?,'pending')", [orderId, groupKey, command]);
  } else {
    await connection.execute("UPDATE store_payment_attempts SET status='simulated' WHERE id=?", [attemptId]);
  }
  return { ok: true as const, duplicate: false };
}

export async function processVerifiedPayment(provider: PaymentProvider, verified: VerifiedPayment, allowDelivery = true, db: Pick<Pool, "getConnection"> = getPool()) {
  const connection = await db.getConnection() as Connection;
  try { await connection.beginTransaction(); const result = await settle(connection, provider, verified, allowDelivery); await connection.commit(); return result; }
  catch (error) { await connection.rollback().catch(() => undefined); throw error; }
  finally { connection.release(); }
}

export async function completeSandboxPayment(token: string, deps: { db?: Db; config?: StorePaymentConfig } = {}) {
  const db = deps.db ?? getPool();
  const config = deps.config ?? readStorePaymentConfig();
  if (config.mode !== "sandbox" || !/^[A-Za-z0-9_-]{32,100}$/.test(token)) return { ok: false as const, status: 404 as const, error: "Sandbox token không hợp lệ." };
  const [rows] = await db.query("SELECT provider_order_id,amount_vnd,expires_at FROM store_payment_attempts WHERE provider='sandbox' AND sandbox_token_hash=? LIMIT 1", [tokenHash(token)]) as [Array<Record<string, unknown>>, unknown];
  const row = rows[0];
  if (!row || new Date(row.expires_at as Date | string).getTime() <= Date.now()) return { ok: false as const, status: 410 as const, error: "Sandbox token đã hết hạn." };
  const verified: VerifiedPayment = { valid: true, paid: true, eventKey: tokenHash(`event:${token}`), eventType: "sandbox.complete", providerOrderId: String(row.provider_order_id), providerTransactionId: `sandbox-${Date.now()}`, amountVnd: Number(row.amount_vnd), sanitizedPayload: { simulated: true } };
  return processVerifiedPayment("sandbox", verified, config.sandboxAllowDelivery, db);
}
