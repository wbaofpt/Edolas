package vn.edolas.telemetry.transport;

import java.net.URI;
import java.time.Duration;

public record TelemetryRequest(
    URI endpoint,
    String serverId,
    String timestamp,
    String nonce,
    String signature,
    String body,
    Duration timeout
) {}
