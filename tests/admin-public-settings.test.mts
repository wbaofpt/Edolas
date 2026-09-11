import test from "node:test";
import assert from "node:assert/strict";
import { readPublicSiteConfig } from "../lib/admin/public-settings.ts";

test("public site config overlays database values on safe defaults", async () => {
  const config = await readPublicSiteConfig({
    async query() {
      return [[
        { setting_key: "server_name", setting_value: "Edolas Realm" },
        { setting_key: "server_ip", setting_value: "play.realm.vn" },
        { setting_key: "bedrock_ip", setting_value: "bedrock.realm.vn" },
        { setting_key: "bedrock_port", setting_value: "19132" },
        { setting_key: "discord_url", setting_value: "https://discord.gg/realm" },
        { setting_key: "maintenance_mode", setting_value: "true" },
        { setting_key: "unknown", setting_value: "ignored" }
      ], undefined] as const;
    }
  } as never);
  assert.deepEqual(config, { serverName: "Edolas Realm", serverIp: "play.realm.vn", bedrockIp: "bedrock.realm.vn", bedrockPort: "19132", discordUrl: "https://discord.gg/realm", maintenanceMode: true });
});

test("public site config remains usable when the settings table is unavailable", async () => {
  const config = await readPublicSiteConfig({ query: async () => { throw new Error("missing migration"); } } as never);
  assert.equal(config.serverName, "EdolasSG");
  assert.equal(config.maintenanceMode, false);
});
