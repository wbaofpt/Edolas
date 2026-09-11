export type TelemetryWorld = {
  name: string;
  players: number;
  loadedChunks: number;
};

export type TelemetryPlayer = {
  uuid: string;
  username: string;
  ping: number;
  world: string;
};

export type TelemetryPluginHealth = {
  name: string;
  version: string;
  enabled: boolean;
};

export type TelemetrySnapshot = {
  schemaVersion: 1;
  reportedAt: string;
  server: {
    id: string;
    group: string;
    displayName: string;
    minecraftVersion: string;
    paperVersion: string;
    startedAt: string;
    uptimeSeconds: number;
  };
  capacity: {
    online: number;
    max: number;
  };
  performance: {
    tps1m: number;
    tps5m: number;
    tps15m: number;
    mspt: number;
    memoryUsedBytes: number;
    memoryMaxBytes: number;
  };
  worlds: TelemetryWorld[];
  players: TelemetryPlayer[];
  pluginHealth: TelemetryPluginHealth[];
};
