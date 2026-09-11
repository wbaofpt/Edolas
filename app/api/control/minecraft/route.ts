import { createControlMinecraftRouteHandler } from "@/lib/minecraft/control-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createControlMinecraftRouteHandler();
