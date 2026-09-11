import {
  createStoreCategoryDeleteHandler,
  createStoreCategoryUpdateHandler,
} from "../../../../../../lib/store/admin-http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = createStoreCategoryUpdateHandler();
export const DELETE = createStoreCategoryDeleteHandler();
