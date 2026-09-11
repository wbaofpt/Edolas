import { createStorePackageDeleteHandler, createStorePackageUpdateHandler } from "../../../../../../lib/store/admin-http.ts";
export const runtime="nodejs"; export const dynamic="force-dynamic"; export const PATCH=createStorePackageUpdateHandler(); export const DELETE=createStorePackageDeleteHandler();
