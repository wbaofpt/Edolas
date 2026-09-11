package vn.edolas.telemetry.model;

import java.util.List;

public record TelemetrySnapshot(
    int schemaVersion,
    String reportedAt,
    ServerInfo server,
    Capacity capacity,
    Performance performance,
    List<WorldInfo> worlds,
    List<PlayerInfo> players,
    List<PluginHealth> pluginHealth
) {
    public TelemetrySnapshot {
        worlds = List.copyOf(worlds);
        players = List.copyOf(players);
        pluginHealth = List.copyOf(pluginHealth);
    }

    public record ServerInfo(
        String id,
        String group,
        String displayName,
        String minecraftVersion,
        String paperVersion,
        String startedAt,
        long uptimeSeconds
    ) {}

    public record Capacity(int online, int max) {}

    public record Performance(
        double tps1m,
        double tps5m,
        double tps15m,
        double mspt,
        long memoryUsedBytes,
        long memoryMaxBytes
    ) {}

    public record WorldInfo(String name, int players, int loadedChunks) {}
    public record PlayerInfo(String uuid, String username, int ping, String world) {}
    public record PluginHealth(String name, String version, boolean enabled) {}
}
