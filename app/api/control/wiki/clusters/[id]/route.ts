import { createControlWikiClusterItemHandler } from "@/lib/control/wiki-http";

const handler = createControlWikiClusterItemHandler();
export const PATCH = handler;
export const DELETE = handler;
