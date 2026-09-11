package vn.edolas.telemetry.collector;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import vn.edolas.telemetry.config.TelemetryConfig;
import vn.edolas.telemetry.model.TelemetrySnapshot;

public final class PaperSnapshotCollector {
    public interface ServerView {
        String minecraftVersion();
        String paperVersion();
        long uptimeSeconds();
        int maxPlayers();
        double[] tps();
        double mspt();
        long memoryUsedBytes();
        long memoryMaxBytes();
        List<WorldState> worlds();
        List<PlayerState> players();
        List<PluginState> plugins(List<String> names);
    }

    public record WorldState(String name, int players, int loadedChunks) {}
    public record PlayerState(String uuid, String username, int ping, String world) {}
    public record PluginState(String name, String version, boolean enabled) {}

    private final TelemetryConfig config;
    private final ServerView server;
    private final Clock clock;

    public PaperSnapshotCollector(TelemetryConfig config, ServerView server, Clock clock) {
        this.config = config;
        this.server = server;
        this.clock = clock;
    }

    public TelemetrySnapshot collect() {
        Instant reportedAt = clock.instant();
        long uptime = Math.max(0, server.uptimeSeconds());
        var onlinePlayers = server.players();
        var players = onlinePlayers.stream().limit(1_000).map(player -> new TelemetrySnapshot.PlayerInfo(player.uuid(), player.username(), clampInt(player.ping(), 0, 1_000_000), player.world())).toList();
        var worlds = server.worlds().stream().limit(32).map(world -> new TelemetrySnapshot.WorldInfo(world.name(), clampInt(world.players(), 0, 1_000_000), clampInt(world.loadedChunks(), 0, 1_000_000_000))).toList();
        var plugins = server.plugins(config.criticalPlugins()).stream().limit(128).map(plugin -> new TelemetrySnapshot.PluginHealth(plugin.name(), plugin.version(), plugin.enabled())).toList();
        double[] tps = server.tps();
        long maxMemory = Math.max(0, server.memoryMaxBytes());
        long usedMemory = Math.min(maxMemory, Math.max(0, server.memoryUsedBytes()));
        return new TelemetrySnapshot(
            1,
            reportedAt.toString(),
            new TelemetrySnapshot.ServerInfo(config.serverId(), config.group(), config.displayName(), server.minecraftVersion(), server.paperVersion(), reportedAt.minusSeconds(uptime).toString(), uptime),
            new TelemetrySnapshot.Capacity(onlinePlayers.size(), Math.max(onlinePlayers.size(), server.maxPlayers())),
            new TelemetrySnapshot.Performance(tps(tps, 0), tps(tps, 1), tps(tps, 2), clamp(server.mspt(), 0, 1_000_000), usedMemory, maxMemory),
            worlds,
            players,
            plugins
        );
    }

    private static double tps(double[] values, int index) { return index < values.length ? clamp(values[index], 0, 20) : 0; }
    private static double clamp(double value, double min, double max) { return Double.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0; }
    private static int clampInt(int value, int min, int max) { return Math.max(min, Math.min(max, value)); }
}
