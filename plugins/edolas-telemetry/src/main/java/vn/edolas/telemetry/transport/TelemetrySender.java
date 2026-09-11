package vn.edolas.telemetry.transport;

import com.google.gson.Gson;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.function.DoubleSupplier;
import java.util.function.LongSupplier;
import vn.edolas.telemetry.config.TelemetryConfig;
import vn.edolas.telemetry.model.TelemetrySnapshot;
import vn.edolas.telemetry.security.RequestSigner;

public final class TelemetrySender implements AutoCloseable {
    private enum ConnectionState { UNKNOWN, CONNECTED, DISCONNECTED }

    private final TelemetryConfig config;
    private final TelemetryTransport transport;
    private final ExecutorService executor;
    private final LongSupplier clockMillis;
    private final DoubleSupplier jitter;
    private final Consumer<String> logger;
    private final Gson gson = new Gson();
    private final AtomicBoolean inFlight = new AtomicBoolean();
    private volatile boolean closed;
    private volatile long nextAttemptAtMillis;
    private volatile int failures;
    private volatile ConnectionState state = ConnectionState.UNKNOWN;
    private volatile CompletableFuture<?> active;

    TelemetrySender(TelemetryConfig config, TelemetryTransport transport, ExecutorService executor, LongSupplier clockMillis, DoubleSupplier jitter, Consumer<String> logger) {
        this.config = config;
        this.transport = transport;
        this.executor = executor;
        this.clockMillis = clockMillis;
        this.jitter = jitter;
        this.logger = logger;
    }

    public static TelemetrySender create(TelemetryConfig config, TelemetryTransport transport, Consumer<String> logger) {
        return new TelemetrySender(config, transport, Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "edolas-telemetry-sender");
            thread.setDaemon(true);
            return thread;
        }), System::currentTimeMillis, Math::random, logger);
    }

    public boolean submit(TelemetrySnapshot snapshot) {
        long currentTime = clockMillis.getAsLong();
        if (closed || currentTime < nextAttemptAtMillis || !inFlight.compareAndSet(false, true)) return false;
        active = CompletableFuture.supplyAsync(() -> request(snapshot), executor)
            .thenCompose(transport::send)
            .whenComplete((status, error) -> {
                updateBackoff(status, error);
                inFlight.set(false);
            });
        return true;
    }

    private TelemetryRequest request(TelemetrySnapshot snapshot) {
        String body = gson.toJson(snapshot);
        if (body.getBytes(StandardCharsets.UTF_8).length > 256 * 1024) throw new IllegalArgumentException("Telemetry snapshot exceeds 256 KiB.");
        String timestamp = Long.toString(clockMillis.getAsLong() / 1000);
        String nonce = UUID.randomUUID().toString();
        String canonical = RequestSigner.canonical(config.serverId(), timestamp, nonce, body);
        return new TelemetryRequest(config.endpoint(), config.serverId(), timestamp, nonce, RequestSigner.signature(config.apiKey(), canonical), body, Duration.ofSeconds(config.requestTimeoutSeconds()));
    }

    private synchronized void updateBackoff(Integer status, Throwable error) {
        boolean success = error == null && status != null && status >= 200 && status < 300;
        if (success) {
            failures = 0;
            nextAttemptAtMillis = 0;
            transition(ConnectionState.CONNECTED, "Website telemetry connection established.");
            return;
        }
        failures = Math.min(5, failures + 1);
        long base = error == null && status != null && status >= 400 && status < 500
            ? 60_000
            : Math.min(60_000, 5_000L << (failures - 1));
        double factor = 0.8 + Math.max(0, Math.min(1, jitter.getAsDouble())) * 0.4;
        nextAttemptAtMillis = clockMillis.getAsLong() + Math.round(base * factor);
        transition(ConnectionState.DISCONNECTED, "Website telemetry unavailable; retry is delayed.");
    }

    private void transition(ConnectionState next, String message) {
        if (state != next) {
            state = next;
            logger.accept(message);
        }
    }

    void awaitIdle() throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (inFlight.get() && System.nanoTime() < deadline) Thread.sleep(5);
        if (inFlight.get()) throw new IllegalStateException("Telemetry sender did not become idle.");
    }

    @Override
    public void close() {
        closed = true;
        CompletableFuture<?> current = active;
        if (current != null) current.cancel(true);
        transport.close();
        executor.shutdownNow();
        try {
            executor.awaitTermination(1, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
