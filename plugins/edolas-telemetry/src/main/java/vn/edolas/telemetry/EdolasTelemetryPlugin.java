package vn.edolas.telemetry;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
import vn.edolas.telemetry.collector.BukkitServerView;
import vn.edolas.telemetry.collector.PaperSnapshotCollector;
import vn.edolas.telemetry.config.TelemetryConfig;
import vn.edolas.telemetry.delivery.CommandDeliveryClient;
import vn.edolas.telemetry.delivery.CommandDeliveryWorker;
import vn.edolas.telemetry.transport.HttpTelemetryTransport;
import vn.edolas.telemetry.transport.TelemetrySender;

public final class EdolasTelemetryPlugin extends JavaPlugin {
    private TelemetrySender sender;
    private BukkitTask collectionTask;
    private CommandDeliveryWorker deliveryWorker;
    private BukkitTask deliveryTask;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        final TelemetryConfig telemetryConfig;
        try {
            telemetryConfig = TelemetryConfig.from(configValues(getConfig()));
        } catch (IllegalArgumentException exception) {
            getLogger().severe("Telemetry is disabled because config.yml is invalid: " + exception.getMessage());
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        var collector = new PaperSnapshotCollector(telemetryConfig, new BukkitServerView(), Clock.systemUTC());
        var transport = new HttpTelemetryTransport(telemetryConfig.connectTimeoutSeconds());
        sender = TelemetrySender.create(telemetryConfig, transport, message -> getLogger().info(message));
        long periodTicks = telemetryConfig.intervalSeconds() * 20L;
        collectionTask = getServer().getScheduler().runTaskTimer(this, () -> {
            try {
                sender.submit(collector.collect());
            } catch (RuntimeException exception) {
                getLogger().warning("Telemetry snapshot collection failed: " + exception.getClass().getSimpleName());
            }
        }, 20L, periodTicks);
        deliveryWorker = CommandDeliveryWorker.create(
            CommandDeliveryClient.create(telemetryConfig),
            runnable -> getServer().getScheduler().runTask(this, runnable),
            command -> getServer().dispatchCommand(getServer().getConsoleSender(), command),
            message -> getLogger().warning(message)
        );
        long deliveryPeriodTicks = telemetryConfig.deliveryIntervalSeconds() * 20L;
        deliveryTask = getServer().getScheduler().runTaskTimer(this, deliveryWorker::poll, 20L, deliveryPeriodTicks);
        getLogger().info("Edolas telemetry enabled for server " + telemetryConfig.serverId() + ".");
    }

    @Override
    public void onDisable() {
        if (collectionTask != null) collectionTask.cancel();
        if (sender != null) sender.close();
        if (deliveryTask != null) deliveryTask.cancel();
        if (deliveryWorker != null) deliveryWorker.close();
        collectionTask = null;
        sender = null;
        deliveryTask = null;
        deliveryWorker = null;
    }

    private static Map<String, Object> configValues(FileConfiguration config) {
        var values = new HashMap<String, Object>();
        values.put("server-id", config.getString("server-id", ""));
        values.put("group", config.getString("group", ""));
        values.put("display-name", config.getString("display-name", ""));
        values.put("endpoint", config.getString("endpoint", ""));
        values.put("delivery-endpoint", config.getString("delivery-endpoint", ""));
        values.put("api-key", config.getString("api-key", ""));
        values.put("interval-seconds", config.getInt("interval-seconds", 10));
        values.put("delivery-interval-seconds", config.getInt("delivery-interval-seconds", 5));
        values.put("connect-timeout-seconds", config.getInt("connect-timeout-seconds", 5));
        values.put("request-timeout-seconds", config.getInt("request-timeout-seconds", 8));
        values.put("critical-plugins", config.getStringList("critical-plugins"));
        return values;
    }
}
