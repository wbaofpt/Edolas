package vn.edolas.telemetry.collector;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import vn.edolas.telemetry.config.TelemetryConfig;

class PaperSnapshotCollectorTest {
    @Test
    void bukkitViewReadsTheGlobalOnlinePlayerCollection() throws Exception {
        var source = Files.readString(Path.of("src/main/java/vn/edolas/telemetry/collector/BukkitServerView.java"));
        assertTrue(source.contains("Bukkit.getOnlinePlayers()"));
        assertFalse(source.contains("Bukkit.getWorlds().stream().flatMap"));
    }

    @Test
    void collectsAnImmutableSchemaV1SnapshotFromTheServerView() {
        var config = TelemetryConfig.from(Map.ofEntries(
            Map.entry("server-id", "survival-01"), Map.entry("group", "survival"), Map.entry("display-name", "Survival 01"),
            Map.entry("endpoint", "https://edolas.test/api/minecraft/telemetry"), Map.entry("delivery-endpoint", "https://edolas.test/api/minecraft/deliveries"),
            Map.entry("api-key", "0123456789abcdef0123456789abcdef"), Map.entry("interval-seconds", 10),
            Map.entry("delivery-interval-seconds", 5), Map.entry("connect-timeout-seconds", 5), Map.entry("request-timeout-seconds", 8),
            Map.entry("critical-plugins", List.of("LuckPerms"))
        ));
        PaperSnapshotCollector.ServerView view = new PaperSnapshotCollector.ServerView() {
            public String minecraftVersion() { return "1.21.1"; }
            public String paperVersion() { return "Paper-123"; }
            public long uptimeSeconds() { return 7200; }
            public int maxPlayers() { return 100; }
            public double[] tps() { return new double[] { 20.4, 19.9, 19.8 }; }
            public double mspt() { return 12.5; }
            public long memoryUsedBytes() { return 1024; }
            public long memoryMaxBytes() { return 4096; }
            public List<PaperSnapshotCollector.WorldState> worlds() { return List.of(new PaperSnapshotCollector.WorldState("world", 1, 120)); }
            public List<PaperSnapshotCollector.PlayerState> players() { return List.of(new PaperSnapshotCollector.PlayerState("123e4567-e89b-12d3-a456-426614174000", "Bao_21", 42, "world")); }
            public List<PaperSnapshotCollector.PluginState> plugins(List<String> names) { return List.of(new PaperSnapshotCollector.PluginState("LuckPerms", "5.4", true)); }
        };

        var collector = new PaperSnapshotCollector(config, view, Clock.fixed(Instant.parse("2026-08-13T12:00:00Z"), ZoneOffset.UTC));
        var snapshot = collector.collect();
        assertEquals(1, snapshot.schemaVersion());
        assertEquals("survival", snapshot.server().group());
        assertEquals(1, snapshot.capacity().online());
        assertEquals(20.0, snapshot.performance().tps1m());
        assertEquals("Bao_21", snapshot.players().getFirst().username());
        assertEquals("LuckPerms", snapshot.pluginHealth().getFirst().name());
    }

    @Test
    void preservesTheRealOnlineCountWhenThePlayerDirectoryIsTruncated() {
        var config = TelemetryConfig.from(Map.ofEntries(
            Map.entry("server-id", "survival-01"), Map.entry("group", "survival"), Map.entry("display-name", "Survival 01"),
            Map.entry("endpoint", "https://edolas.test/api/minecraft/telemetry"), Map.entry("delivery-endpoint", "https://edolas.test/api/minecraft/deliveries"),
            Map.entry("api-key", "0123456789abcdef0123456789abcdef"), Map.entry("interval-seconds", 10),
            Map.entry("delivery-interval-seconds", 5), Map.entry("connect-timeout-seconds", 5), Map.entry("request-timeout-seconds", 8),
            Map.entry("critical-plugins", List.of())
        ));
        var manyPlayers = IntStream.range(0, 1001).mapToObj(index -> new PaperSnapshotCollector.PlayerState(
            "123e4567-e89b-12d3-a456-%012d".formatted(index), "P" + index, 1, "world"
        )).toList();
        PaperSnapshotCollector.ServerView view = new PaperSnapshotCollector.ServerView() {
            public String minecraftVersion() { return "1.21.1"; } public String paperVersion() { return "Paper"; }
            public long uptimeSeconds() { return 1; } public int maxPlayers() { return 2000; }
            public double[] tps() { return new double[] {20,20,20}; } public double mspt() { return 1; }
            public long memoryUsedBytes() { return 1; } public long memoryMaxBytes() { return 2; }
            public List<PaperSnapshotCollector.WorldState> worlds() { return List.of(); }
            public List<PaperSnapshotCollector.PlayerState> players() { return manyPlayers; }
            public List<PaperSnapshotCollector.PluginState> plugins(List<String> names) { return List.of(); }
        };
        var snapshot = new PaperSnapshotCollector(config, view, Clock.systemUTC()).collect();
        assertEquals(1001, snapshot.capacity().online());
        assertEquals(1000, snapshot.players().size());
    }
}
