package vn.edolas.telemetry.transport;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import vn.edolas.telemetry.config.TelemetryConfig;
import vn.edolas.telemetry.model.TelemetrySnapshot;

class TelemetrySenderTest {
    private final List<TelemetrySender> senders = new ArrayList<>();

    @AfterEach
    void closeSenders() {
        senders.forEach(TelemetrySender::close);
    }

    @Test
    void permitsOnlyOneInFlightSnapshot() throws Exception {
        var transport = new ControlledTransport();
        var clock = new AtomicLong(1_786_636_800_000L);
        var sender = sender(transport, clock);

        assertTrue(sender.submit(snapshot()));
        assertFalse(sender.submit(snapshot()));
        transport.awaitRequest();
        transport.complete(202);
        sender.awaitIdle();
        assertTrue(sender.submit(snapshot()));
    }

    @Test
    void serverFailureAppliesBoundedBackoffBeforeTheNextSnapshot() throws Exception {
        var transport = new ControlledTransport();
        var clock = new AtomicLong(1_786_636_800_000L);
        var sender = sender(transport, clock);

        assertTrue(sender.submit(snapshot()));
        transport.awaitRequest();
        transport.complete(503);
        sender.awaitIdle();
        assertFalse(sender.submit(snapshot()));
        clock.addAndGet(60_000);
        assertTrue(sender.submit(snapshot()));
    }

    private TelemetrySender sender(ControlledTransport transport, AtomicLong clock) {
        var config = TelemetryConfig.from(Map.ofEntries(
            Map.entry("server-id", "survival-01"), Map.entry("group", "survival"), Map.entry("display-name", "Survival 01"),
            Map.entry("endpoint", "https://edolas.test/api/minecraft/telemetry"), Map.entry("api-key", "0123456789abcdef0123456789abcdef"),
            Map.entry("delivery-endpoint", "https://edolas.test/api/minecraft/deliveries"), Map.entry("interval-seconds", 10),
            Map.entry("delivery-interval-seconds", 5), Map.entry("connect-timeout-seconds", 5), Map.entry("request-timeout-seconds", 8),
            Map.entry("critical-plugins", List.of("LuckPerms"))
        ));
        var sender = new TelemetrySender(config, transport, Executors.newSingleThreadExecutor(), clock::get, () -> 0.5, ignored -> {});
        senders.add(sender);
        return sender;
    }

    private static TelemetrySnapshot snapshot() {
        return new TelemetrySnapshot(1, "2026-08-13T12:00:00Z",
            new TelemetrySnapshot.ServerInfo("survival-01", "survival", "Survival 01", "1.21.1", "Paper", "2026-08-13T10:00:00Z", 7200),
            new TelemetrySnapshot.Capacity(0, 100), new TelemetrySnapshot.Performance(20, 20, 20, 10, 1024, 4096),
            List.of(), List.of(), List.of());
    }

    private static final class ControlledTransport implements TelemetryTransport {
        private volatile CompletableFuture<Integer> pending;

        @Override
        public CompletableFuture<Integer> send(TelemetryRequest request) {
            pending = new CompletableFuture<>();
            return pending;
        }

        void awaitRequest() throws Exception {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
            while (pending == null && System.nanoTime() < deadline) Thread.sleep(5);
            assertTrue(pending != null, "sender did not reach transport");
        }

        void complete(int status) { pending.complete(status); }
    }
}
