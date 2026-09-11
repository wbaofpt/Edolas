import { MinecraftDashboard } from "@/components/control/minecraft-dashboard";
import { requireControlAccountAdmin } from "@/lib/control/server-session";
import { readControlMinecraftStatus } from "@/lib/minecraft/control-status";

export default async function MinecraftControlPage() {
  await requireControlAccountAdmin();
  const status = await readControlMinecraftStatus().catch(() => null);
  return <MinecraftDashboard initialStatus={status} />;
}
