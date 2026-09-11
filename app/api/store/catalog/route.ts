import { createStoreCatalogHandler } from "../../../../lib/store/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createStoreCatalogHandler();
