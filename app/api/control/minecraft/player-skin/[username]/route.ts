import { createMinecraftSkinHandler } from "@/lib/minecraft/mojang-skin-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createMinecraftSkinHandler();
