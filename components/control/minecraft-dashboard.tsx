"use client";

import { Activity, Boxes, ChevronDown, Clock3, Cpu, HardDrive, RadioTower, Server, Trash2, TriangleAlert, UsersRound, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MinecraftGroupDeleteDialog } from "@/components/control/minecraft-group-delete-dialog";
import { MinecraftPlayerDirectory } from "@/components/control/minecraft-player-directory";
import { controlFetch } from "@/lib/control/client";
import { isCurrentMinecraftPoll, removeMinecraftGroupFromStatus } from "@/lib/minecraft/dashboard-state";
import { buildMinecraftPlayerDirectory, formatMinecraftLocation } from "@/lib/minecraft/player-directory";
import type { ControlMinecraftGroup, ControlMinecraftServer, ControlMinecraftStatus } from "@/lib/minecraft/control-status";

const number = new Intl.NumberFormat("vi-VN");

function duration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days ? `${days}d ` : ""}${hours}h ${minutes}m`;
}

function bytes(value: number) { return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`; }

function Metric({ icon: Icon, label, value, tone = "normal" }: { icon: typeof Activity; label: string; value: string; tone?: "normal" | "warning" | "danger" }) {
  return <div className={`minecraft-control-metric is-${tone}`}><Icon aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>;
}

function ServerCard({ server }: { server: ControlMinecraftServer }) {
  const memoryPercent = server.memory.max ? Math.min(100, (server.memory.used / server.memory.max) * 100) : 0;
  return <article className={`minecraft-control-server ${server.status === "offline" ? "is-offline" : ""}`}>
    <header><div><span>BACKEND // {server.id}</span><h2>{server.displayName}</h2></div><b className={`minecraft-control-state is-${server.status}`}><i />{server.status}</b></header>
    <div className="minecraft-control-server-grid">
      <Metric icon={UsersRound} label="Players" value={`${server.online} / ${server.max}`} />
      <Metric icon={Activity} label="TPS 1m" value={server.tps.one.toFixed(2)} tone={server.tps.one < 18 ? "warning" : "normal"} />
      <Metric icon={Cpu} label="MSPT" value={`${server.mspt.toFixed(1)} ms`} tone={server.mspt > 50 ? "warning" : "normal"} />
      <Metric icon={Clock3} label="Uptime" value={duration(server.uptimeSeconds)} />
    </div>
    <div className="minecraft-control-memory"><span><HardDrive /> RAM <b>{bytes(server.memory.used)} / {bytes(server.memory.max)}</b></span><div><i style={{ width: `${memoryPercent}%` }} /></div></div>
    <footer><span>Minecraft {server.minecraftVersion}</span><span>{server.worlds.length} worlds</span><time dateTime={server.lastSeenAt}>{new Date(server.lastSeenAt).toLocaleTimeString("vi-VN")}</time></footer>
  </article>;
}

export function MinecraftDashboard({ initialStatus }: { initialStatus: ControlMinecraftStatus | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(initialStatus ? "" : "Chua nhan duoc telemetry tu Minecraft.");
  const [selectedGroup, setSelectedGroup] = useState<ControlMinecraftGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [mutationMessage, setMutationMessage] = useState("");
  const pollGeneration = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const schedule = () => { if (!cancelled) timer = setTimeout(refresh, 10_000); };
    async function refresh() {
      if (document.visibilityState !== "visible") return schedule();
      const generation = pollGeneration.current;
      try {
        const response = await fetch("/api/control/minecraft", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error("unavailable");
        if (!cancelled && isCurrentMinecraftPoll(generation, pollGeneration.current)) {
          setStatus(body.status);
          setError("");
        }
      } catch {
        if (!cancelled && isCurrentMinecraftPoll(generation, pollGeneration.current)) {
          setError("Khong the cap nhat telemetry luc nay.");
        }
      }
      schedule();
    }
    function visible() {
      if (document.visibilityState === "visible") { if (timer) clearTimeout(timer); void refresh(); }
    }
    schedule();
    document.addEventListener("visibilitychange", visible);
    return () => { cancelled = true; if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);

  const groups = status?.groups ?? [];
  const activeServers = groups.reduce((total, group) => total + group.activeServers, 0);
  const healthyGroups = groups.filter((group) => group.status === "online").length;
  const offlineBackends = Math.max(0, (status?.servers.length ?? 0) - activeServers);
  const players = buildMinecraftPlayerDirectory(status);
  const plugins = groups.flatMap((group) => group.servers.flatMap((server) => server.pluginHealth.map((plugin) => ({ ...plugin, group: group.label, server: server.displayName, serverStatus: server.status }))));
  const allGroupsOnline = groups.length > 0 && groups.every((group) => group.status === "online");

  async function deleteSelectedGroup() {
    if (!selectedGroup || deletingGroup) return;
    const group = selectedGroup;
    pollGeneration.current += 1;
    setDeletingGroup(true);
    setMutationMessage("");
    try {
      const response = await controlFetch(`/api/control/minecraft/groups/${encodeURIComponent(group.key)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Không thể xóa dữ liệu cụm.");
      setStatus((current) => current ? removeMinecraftGroupFromStatus(current, group.key) : current);
      setMutationMessage(`Đã xóa dữ liệu cụm ${group.label} và ${body.deletedServers} backend.`);
      setSelectedGroup(null);
    } catch (deleteError) {
      setMutationMessage(deleteError instanceof Error ? deleteError.message : "Không thể xóa dữ liệu cụm lúc này.");
    } finally {
      pollGeneration.current += 1;
      setDeletingGroup(false);
    }
  }

  return <div className="minecraft-control-page">
    <header className="minecraft-control-hero">
      <div><p><RadioTower aria-hidden="true" /> NETWORK TELEMETRY // LIVE OPERATIONS</p><h1>Máy chủ Minecraft</h1><span>Theo dõi sức khỏe network, xử lý backend mất tín hiệu và kiểm tra người chơi từ một màn hình.</span></div>
      <div className={`minecraft-control-network is-${status?.network.status ?? "offline"}`}><i aria-hidden="true" /><span>Network</span><strong>{status?.network.status ?? "unavailable"}</strong><time dateTime={status?.network.lastUpdatedAt ?? undefined}>{status?.network.lastUpdatedAt ? `Tín hiệu ${new Date(status.network.lastUpdatedAt).toLocaleTimeString("vi-VN")}` : "Chưa có tín hiệu"}</time></div>
    </header>
    {error ? <p className="minecraft-control-alert" role="status"><WifiOff aria-hidden="true" />{error}</p> : null}
    <p className="minecraft-control-notice" aria-live="polite">{mutationMessage}</p>

    <section className="minecraft-control-summary" aria-label="Tổng quan vận hành Minecraft">
      <Metric icon={UsersRound} label="Người chơi online" value={number.format(status?.network.online ?? 0)} />
      <Metric icon={Boxes} label="Cụm khỏe" value={`${healthyGroups} / ${groups.length}`} tone={healthyGroups < groups.length ? "warning" : "normal"} />
      <Metric icon={Server} label="Backend có tín hiệu" value={`${activeServers} / ${status?.servers.length ?? 0}`} tone={offlineBackends > 0 ? "warning" : "normal"} />
      <Metric icon={TriangleAlert} label="Backend mất tín hiệu" value={String(offlineBackends)} tone={offlineBackends > 0 ? "danger" : "normal"} />
    </section>

    <section className="minecraft-control-groups" aria-labelledby="minecraft-cluster-inventory-title">
      <header className="minecraft-control-section-heading"><div><span>CLUSTER INVENTORY</span><h2 id="minecraft-cluster-inventory-title" tabIndex={-1}>Cụm máy chủ</h2></div><p>Cụm cần xử lý được mở sẵn. Chỉ dữ liệu của cụm offline mới có thể xóa.</p></header>
      {groups.map((group, index) => <details className={`minecraft-control-group is-${group.status}`} open={group.status !== "online" || (allGroupsOnline && index === 0)} key={group.key}>
        <summary className="minecraft-control-group-summary">
          <div className="minecraft-control-group-identity"><span>CLUSTER</span><small>{group.key}</small><h2>{group.label}</h2>{!group.mapped ? <b>CHƯA GÁN CHẾ ĐỘ</b> : null}</div>
          <div className="minecraft-control-group-stats"><span><strong>{number.format(group.online)}</strong> người chơi</span><span><strong>{group.activeServers}/{group.totalServers}</strong> backend</span></div>
          <span className={`minecraft-control-state is-${group.status}`}><i aria-hidden="true" />{group.status}</span>
          <ChevronDown className="minecraft-control-group-chevron" aria-hidden="true" />
        </summary>
        {group.status === "offline" ? <div className="minecraft-control-group-operations"><div><TriangleAlert aria-hidden="true" /><p><strong>Cụm đã mất toàn bộ tín hiệu</strong><span>Có thể dọn snapshot cũ sau khi chắc chắn plugin backend đã dừng.</span></p></div><button type="button" onClick={() => { setMutationMessage(""); setSelectedGroup(group); }}><Trash2 aria-hidden="true" />Xóa dữ liệu cụm</button></div> : null}
        <div className={`minecraft-control-card-grid ${group.servers.length === 1 ? "is-single" : ""}`}>{group.servers.map((server) => <ServerCard key={server.id} server={server} />)}</div>
      </details>)}
      {groups.length === 0 ? <p className="minecraft-control-empty">Chưa có backend nào gửi telemetry.</p> : null}
    </section>

    <section className="minecraft-control-lower-grid">
      <MinecraftPlayerDirectory players={players} />
      <article className="minecraft-control-panel"><header><div><span>CRITICAL INTEGRATIONS</span><h2>Plugin health</h2></div></header><div className="minecraft-control-plugin-list">{plugins.map((plugin) => {
        const ready = plugin.serverStatus === "online" && plugin.enabled;
        const state = plugin.serverStatus === "offline" ? "UNKNOWN" : ready ? "READY" : "DOWN";
        return <div key={`${plugin.server}-${plugin.name}`}><i className={plugin.serverStatus === "offline" ? "is-unknown" : ready ? "is-online" : "is-offline"} /><p><strong>{plugin.name}</strong><span>{formatMinecraftLocation(plugin.group, plugin.server)}{" / v"}{plugin.version}</span></p><b className={plugin.serverStatus === "offline" ? "is-unknown" : ""}>{state}</b></div>;
      })}{plugins.length === 0 ? <p className="minecraft-control-empty">Chưa cấu hình critical-plugins.</p> : null}</div></article>
    </section>

    <MinecraftGroupDeleteDialog group={selectedGroup} busy={deletingGroup} onCancel={() => { if (!deletingGroup) setSelectedGroup(null); }} onConfirm={() => void deleteSelectedGroup()} />
  </div>;
}
