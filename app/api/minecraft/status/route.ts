import { readPublicMinecraftStatus } from "@/lib/minecraft/public-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await readPublicMinecraftStatus();
  if (!status) return Response.json({ ok: false, error: "Minecraft status is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json({ ok: true, status }, { headers: { "Cache-Control": "no-store" } });
}
