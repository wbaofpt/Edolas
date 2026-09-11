package vn.edolas.telemetry;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import org.bukkit.plugin.java.JavaPlugin;
import org.junit.jupiter.api.Test;

class PluginWiringTest {
    @Test
    void exposesThePaperMainClassAndDescriptor() throws Exception {
        assertTrue(JavaPlugin.class.isAssignableFrom(EdolasTelemetryPlugin.class));
        try (var stream = getClass().getClassLoader().getResourceAsStream("plugin.yml")) {
            String descriptor = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertTrue(descriptor.contains("main: vn.edolas.telemetry.EdolasTelemetryPlugin"));
            assertTrue(descriptor.contains("api-version: '1.21'"));
            assertTrue(descriptor.contains("version: '1.0.0'"));
        }
    }
}
