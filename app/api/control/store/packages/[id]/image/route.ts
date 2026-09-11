import { createStorePackageImageHandler } from "../../../../../../../lib/store/package-image-http.ts";

const handler = createStorePackageImageHandler();
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handler;
export const DELETE = handler;
