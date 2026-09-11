package vn.edolas.telemetry.collector;

import java.lang.management.ManagementFactory;
import java.util.List;
import org.bukkit.Bukkit;
import vn.edolas.telemetry.collector.PaperSnapshotCollector.PlayerState;
import vn.edolas.telemetry.collector.PaperSnapshotCollector.PluginState;
import vn.edolas.telemetry.collector.PaperSnapshotCollector.WorldState;

public final class BukkitServerView implements PaperSnapshotCollector.ServerView {
    @Override
    public String minecraftVersion() { return Bukkit.getMinecraftVersion(); }

    @Override
    public String paperVersion() { return Bukkit.getVersion(); }

    @Override
    public long uptimeSeconds() { return ManagementFactory.getRuntimeMXBean().getUptime() / 1_000; }

    @Override
    public int maxPlayers() { return Bukkit.getMaxPlayers(); }

    @Override
    public double[] tps() { return Bukkit.getTPS(); }

    @Override
    public double mspt() { return Bukkit.getAverageTickTime(); }

    @Override
    public long memoryUsedBytes() {
        Runtime runtime = Runtime.getRuntime();
        return runtime.totalMemory() - runtime.freeMemory();
    }

    @Override
    public long memoryMaxBytes() { return Runtime.getRuntime().maxMemory(); }

    @Override
    public List<WorldState> worlds() {
        return Bukkit.getWorlds().stream().map(world -> new WorldState(world.getName(), world.getPlayers().size(), world.getChunkCount())).toList();
    }

    @Override
    public List<PlayerState> players() {
        return Bukkit.getOnlinePlayers().stream().map(player -> new PlayerState(player.getUniqueId().toString(), player.getName(), player.getPing(), player.getWorld().getName())).toList();
    }

    @Override
    public List<PluginState> plugins(List<String> names) {
        return names.stream().map(name -> {
            var plugin = Bukkit.getPluginManager().getPlugin(name);
            return plugin == null
                ? new PluginState(name, "not-installed", false)
                : new PluginState(plugin.getName(), plugin.getPluginMeta().getVersion(), plugin.isEnabled());
        }).toList();
    }
}
