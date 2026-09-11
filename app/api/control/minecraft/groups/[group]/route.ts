import { createMinecraftGroupDeleteHandler } from "@/lib/minecraft/group-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const DELETE = createMinecraftGroupDeleteHandler();
