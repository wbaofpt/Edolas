package vn.edolas.telemetry.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TelemetryConfigTest {
    private static Map<String, Object> valid() {
        return Map.ofEntries(
            Map.entry("server-id", "survival-01"),
            Map.entry("group", "survival"),
            Map.entry("display-name", "Survival 01"),
            Map.entry("endpoint", "https://edolas.test/api/minecraft/telemetry"),
            Map.entry("delivery-endpoint", "https://edolas.test/api/minecraft/deliveries"),
            Map.entry("api-key", "0123456789abcdef0123456789abcdef"),
            Map.entry("interval-seconds", 10),
            Map.entry("delivery-interval-seconds", 5),
            Map.entry("connect-timeout-seconds", 5),
            Map.entry("request-timeout-seconds", 8),
            Map.entry("critical-plugins", List.of("LuckPerms", "Vault"))
        );
    }

    @Test
    void parsesBoundedProductionConfiguration() {
        TelemetryConfig config = TelemetryConfig.from(valid());
        assertEquals("survival-01", config.serverId());
        assertEquals(URI.create("https://edolas.test/api/minecraft/telemetry"), config.endpoint());
        assertEquals(URI.create("https://edolas.test/api/minecraft/deliveries"), config.deliveryEndpoint());
        assertEquals(5, config.deliveryIntervalSeconds());
        assertEquals(List.of("LuckPerms", "Vault"), config.criticalPlugins());
    }

    @Test
    void derivesDeliveryEndpointForExistingConfigs() {
        var values = new java.util.HashMap<>(valid());
        values.put("delivery-endpoint", "");
        TelemetryConfig config = TelemetryConfig.from(values);
        assertEquals(URI.create("https://edolas.test/api/minecraft/deliveries"), config.deliveryEndpoint());
    }

    @Test
    void rejectsWeakKeysAndUnsafeRemoteHttp() {
        var weak = new java.util.HashMap<>(valid());
        weak.put("api-key", "short");
        assertThrows(IllegalArgumentException.class, () -> TelemetryConfig.from(weak));
        var http = new java.util.HashMap<>(valid());
        http.put("endpoint", "http://edolas.test/api/minecraft/telemetry");
        assertThrows(IllegalArgumentException.class, () -> TelemetryConfig.from(http));
        var placeholder = new java.util.HashMap<>(valid());
        placeholder.put("api-key", "replace-with-at-least-32-random-characters");
        assertThrows(IllegalArgumentException.class, () -> TelemetryConfig.from(placeholder));
    }
}
