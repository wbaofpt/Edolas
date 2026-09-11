export type StorePaymentConfig = {
  mode: "sandbox" | "live";
  sandboxAllowDelivery: boolean;
  appPublicUrl: string;
  payos: { clientId: string; apiKey: string; checksumKey: string } | null;
  momo: { partnerCode: string; accessKey: string; secretKey: string; endpoint: string } | null;
};

type Env = Record<string, string | undefined>;

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function complete(values: Array<string | undefined>) {
  return values.every((value) => Boolean(value?.trim()));
}

export function readStorePaymentConfig(env: Env = process.env): StorePaymentConfig {
  const mode = env.STORE_PAYMENT_MODE?.trim() || "sandbox";
  if (mode !== "sandbox" && mode !== "live") {
    throw new Error("STORE_PAYMENT_MODE must be sandbox or live.");
  }
  const sandboxAllowDelivery = enabled(env.STORE_SANDBOX_ALLOW_DELIVERY);
  if (env.NODE_ENV === "production" && mode === "sandbox" && sandboxAllowDelivery) {
    throw new Error("Sandbox delivery must stay disabled in production.");
  }
  const appPublicUrl = (env.APP_PUBLIC_URL || env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  if (mode === "live" && !appPublicUrl.startsWith("https://")) {
    throw new Error("Live payments require an HTTPS APP_PUBLIC_URL.");
  }
  const payosValues = [env.PAYOS_CLIENT_ID, env.PAYOS_API_KEY, env.PAYOS_CHECKSUM_KEY];
  const momoValues = [env.MOMO_PARTNER_CODE, env.MOMO_ACCESS_KEY, env.MOMO_SECRET_KEY];
  return {
    mode,
    sandboxAllowDelivery,
    appPublicUrl,
    payos: complete(payosValues) ? {
      clientId: env.PAYOS_CLIENT_ID!.trim(),
      apiKey: env.PAYOS_API_KEY!.trim(),
      checksumKey: env.PAYOS_CHECKSUM_KEY!.trim(),
    } : null,
    momo: complete(momoValues) ? {
      partnerCode: env.MOMO_PARTNER_CODE!.trim(),
      accessKey: env.MOMO_ACCESS_KEY!.trim(),
      secretKey: env.MOMO_SECRET_KEY!.trim(),
      endpoint: env.MOMO_ENDPOINT?.trim() || "https://test-payment.momo.vn/v2/gateway/api/create",
    } : null,
  };
}
