import { createStoreOrdersGetHandler, createStoreOrdersPostHandler } from "../../../../lib/store/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createStoreOrdersGetHandler();
export const POST = createStoreOrdersPostHandler();
