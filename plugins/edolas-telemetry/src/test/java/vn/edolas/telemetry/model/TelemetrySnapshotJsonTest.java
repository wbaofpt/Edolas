package vn.edolas.telemetry.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.Gson;
import java.util.List;
import org.junit.jupiter.api.Test;

class TelemetrySnapshotJsonTest {
    @Test
    void serializesTheVersionedWebsiteContract() {
        var snapshot = new TelemetrySnapshot(
            1,
            "2026-08-13T12:00:00Z",
            new TelemetrySnapshot.ServerInfo("survival-01", "survival", "Survival 01", "1.21.1", "1.21.1-123", "2026-08-13T10:00:00Z", 7200),
            new TelemetrySnapshot.Capacity(1, 100),
            new TelemetrySnapshot.Performance(20, 19.9, 19.8, 12.5, 1024, 4096),
            List.of(new TelemetrySnapshot.WorldInfo("world", 1, 120)),
            List.of(new TelemetrySnapshot.PlayerInfo("123e4567-e89b-12d3-a456-426614174000", "Bao_21", 42, "world")),
            List.of(new TelemetrySnapshot.PluginHealth("LuckPerms", "5.4", true))
        );

        String json = new Gson().toJson(snapshot);
        assertEquals(1, new Gson().fromJson(json, com.google.gson.JsonObject.class).get("schemaVersion").getAsInt());
        assertTrue(json.contains("\"pluginHealth\""));
        assertTrue(json.contains("\"memoryUsedBytes\":1024"));
    }
}
