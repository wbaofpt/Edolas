import { createStoreGroupUpdateHandler } from "../../../../../../lib/store/admin-http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = createStoreGroupUpdateHandler();
