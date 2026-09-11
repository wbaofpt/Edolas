import { createControlWikiPageItemHandler } from "@/lib/control/wiki-http";

const handler = createControlWikiPageItemHandler();
export const PATCH = handler;
export const DELETE = handler;
