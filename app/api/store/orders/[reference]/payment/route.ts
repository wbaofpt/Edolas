import { createPaymentStatusHandler } from "../../../../../../lib/store/payments/http.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createPaymentStatusHandler();
