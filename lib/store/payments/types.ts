export type PaymentProvider = "sandbox" | "payos" | "momo";
export type PaymentAttemptStatus =
  | "creating"
  | "awaiting_payment"
  | "paid"
  | "expired"
  | "cancelled"
  | "failed"
  | "simulated";

export type PaymentSessionInput = {
  reference: string;
  amountVnd: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
};

export type PaymentSession = {
  providerOrderId: string;
  checkoutUrl: string | null;
  qrContent: string;
  expiresAt: Date;
  sandboxCompletionToken?: string;
};

export type VerifiedPayment = {
  valid: boolean;
  eventKey: string;
  eventType: string;
  providerOrderId: string;
  providerTransactionId: string | null;
  amountVnd: number | null;
  paid: boolean;
  sanitizedPayload: Record<string, unknown>;
  reason?: string;
};

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createSession(input: PaymentSessionInput): Promise<PaymentSession>;
  verifyWebhook(payload: unknown): VerifiedPayment;
}
