package vn.edolas.telemetry.delivery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class CommandDeliveryWorkerTest {
    @Test
    void claimsOneCommandThenDispatchesOnMainThreadAndCompletesOffThread() throws Exception {
        var client = new RecordingClient();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        var mainThreadTask = new AtomicReference<Runnable>();
        var scheduled = new CountDownLatch(1);
        var dispatchedCommand = new AtomicReference<String>();
        var worker = new CommandDeliveryWorker(client, executor, runnable -> {
            mainThreadTask.set(runnable);
            scheduled.countDown();
        }, command -> {
            dispatchedCommand.set(command);
            return true;
        }, ignored -> {});

        try {
            assertTrue(worker.poll());
            assertFalse(worker.poll());
            assertTrue(client.claimed.await(2, TimeUnit.SECONDS));
            assertTrue(scheduled.await(2, TimeUnit.SECONDS));
            assertNull(dispatchedCommand.get());

            Runnable dispatch = mainThreadTask.get();
            assertNotNull(dispatch);
            dispatch.run();

            assertEquals("lp user QuocBaooo parent add vip", dispatchedCommand.get());
            assertTrue(client.completed.await(2, TimeUnit.SECONDS));
            assertEquals(42L, client.deliveryId.get());
            assertEquals("claim-token-01234567890123456789012345678901", client.claimToken.get());
            assertTrue(client.success.get());
            assertEquals("Command accepted", client.output.get());
            assertEquals(1, client.claimCalls.get());
        } finally {
            worker.close();
        }
    }

    private static final class RecordingClient implements CommandDeliveryClient {
        private final CountDownLatch claimed = new CountDownLatch(1);
        private final CountDownLatch completed = new CountDownLatch(1);
        private final AtomicInteger claimCalls = new AtomicInteger();
        private final AtomicReference<Long> deliveryId = new AtomicReference<>();
        private final AtomicReference<String> claimToken = new AtomicReference<>();
        private final AtomicReference<Boolean> success = new AtomicReference<>();
        private final AtomicReference<String> output = new AtomicReference<>();

        @Override
        public Optional<CommandDelivery> claim() {
            claimCalls.incrementAndGet();
            claimed.countDown();
            return Optional.of(new CommandDelivery(42L, "claim-token-01234567890123456789012345678901", "lp user QuocBaooo parent add vip"));
        }

        @Override
        public void complete(long id, String token, boolean wasSuccessful, String summary) {
            deliveryId.set(id);
            claimToken.set(token);
            success.set(wasSuccessful);
            output.set(summary);
            completed.countDown();
        }
    }
}
