import { createMomoIpnHandler } from "../../../../../../lib/store/payments/http.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createMomoIpnHandler();
