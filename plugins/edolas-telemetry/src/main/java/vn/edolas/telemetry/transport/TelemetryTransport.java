package vn.edolas.telemetry.transport;

import java.util.concurrent.CompletableFuture;

public interface TelemetryTransport extends AutoCloseable {
    CompletableFuture<Integer> send(TelemetryRequest request);

    @Override
    default void close() {}
}
