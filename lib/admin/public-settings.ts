import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";

type PublicSettingsDb = Pick<Pool, "query">;
export type PublicSiteConfig = { serverName: string; serverIp: string; bedrockIp: string; bedrockPort: string; discordUrl: string; maintenanceMode: boolean };

const defaults: PublicSiteConfig = {
  serverName: "EdolasSG",
  serverIp: "play.edolassg.vn",
  bedrockIp: "play.edolassg.vn",
  bedrockPort: "19132",
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/edolassg",
  maintenanceMode: false
};

export async function readPublicSiteConfig(db: PublicSettingsDb = getPool()): Promise<PublicSiteConfig> {
  try {
    const [rows] = await db.query("SELECT setting_key, setting_value FROM site_settings WHERE is_public = TRUE") as [Array<{ setting_key: string; setting_value: string }>, unknown];
    const values = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
    return {
      serverName: values.server_name?.trim() || defaults.serverName,
      serverIp: values.server_ip?.trim() || defaults.serverIp,
      bedrockIp: values.bedrock_ip?.trim() || values.server_ip?.trim() || defaults.bedrockIp,
      bedrockPort: values.bedrock_port?.trim() || defaults.bedrockPort,
      discordUrl: values.discord_url?.trim() || defaults.discordUrl,
      maintenanceMode: values.maintenance_mode === "true"
    };
  } catch {
    return defaults;
  }
}
