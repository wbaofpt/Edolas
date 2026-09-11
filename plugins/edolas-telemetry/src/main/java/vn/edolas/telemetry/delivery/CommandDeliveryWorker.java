package vn.edolas.telemetry.delivery;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

public final class CommandDeliveryWorker implements AutoCloseable {
    private final CommandDeliveryClient client;
    private final ExecutorService executor;
    private final Consumer<Runnable> mainThread;
    private final CommandDispatcher dispatcher;
    private final Consumer<String> logger;
    private final AtomicBoolean inFlight = new AtomicBoolean();
    private volatile boolean closed;

    CommandDeliveryWorker(CommandDeliveryClient client, ExecutorService executor, Consumer<Runnable> mainThread, CommandDispatcher dispatcher, Consumer<String> logger) {
        this.client = client;
        this.executor = executor;
        this.mainThread = mainThread;
        this.dispatcher = dispatcher;
        this.logger = logger;
    }

    public static CommandDeliveryWorker create(CommandDeliveryClient client, Consumer<Runnable> mainThread, CommandDispatcher dispatcher, Consumer<String> logger) {
        ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "edolas-command-delivery");
            thread.setDaemon(true);
            return thread;
        });
        return new CommandDeliveryWorker(client, executor, mainThread, dispatcher, logger);
    }

    public boolean poll() {
        if (closed || !inFlight.compareAndSet(false, true)) return false;
        try {
            executor.execute(this::claimAndSchedule);
            return true;
        } catch (RuntimeException exception) {
            inFlight.set(false);
            logger.accept("Command delivery polling is unavailable.");
            return false;
        }
    }

    private void claimAndSchedule() {
        boolean dispatchScheduled = false;
        try {
            if (closed) return;
            var delivery = client.claim();
            if (delivery.isPresent()) dispatchScheduled = scheduleDispatch(delivery.get());
        } catch (RuntimeException exception) {
            logger.accept("Command delivery claim failed.");
        } finally {
            if (!closed && !dispatchScheduled) inFlight.set(false);
        }
    }

    private boolean scheduleDispatch(CommandDelivery delivery) {
        if (closed) return false;
        try {
            mainThread.accept(() -> dispatchAndComplete(delivery));
            return true;
        } catch (RuntimeException exception) {
            completeAsync(delivery, false, "Command dispatch unavailable");
            return true;
        }
    }

    private void dispatchAndComplete(CommandDelivery delivery) {
        if (closed) return;
        boolean success;
        String output;
        try {
            success = dispatcher.dispatch(delivery.command());
            output = success ? "Command accepted" : "Command rejected";
        } catch (RuntimeException exception) {
            success = false;
            output = "Command dispatch failed";
        }
        completeAsync(delivery, success, output);
    }

    private void completeAsync(CommandDelivery delivery, boolean success, String output) {
        try {
            executor.execute(() -> {
                try {
                    client.complete(delivery.deliveryId(), delivery.claimToken(), success, output);
                } catch (RuntimeException exception) {
                    logger.accept("Command delivery completion failed.");
                } finally {
                    inFlight.set(false);
                }
            });
        } catch (RuntimeException exception) {
            inFlight.set(false);
            logger.accept("Command delivery completion is unavailable.");
        }
    }

    @Override
    public void close() {
        closed = true;
        executor.shutdownNow();
        try {
            executor.awaitTermination(1, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
        client.close();
    }

    @FunctionalInterface
    public interface CommandDispatcher {
        boolean dispatch(String command);
    }
}
