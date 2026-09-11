import { createSearchHandler } from "@/lib/search/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createSearchHandler();
