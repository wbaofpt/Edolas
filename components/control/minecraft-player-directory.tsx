"use client";

import { RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { MinecraftPlayerHead } from "@/components/control/minecraft-player-head";
import {
  buildMinecraftPlayerFilterOptions,
  filterMinecraftPlayers,
  formatMinecraftLocation,
  type MinecraftPingFilter,
  type MinecraftPlayerDirectoryEntry
} from "@/lib/minecraft/player-directory";

export function MinecraftPlayerDirectory({ players }: { players: MinecraftPlayerDirectoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [serverFilter, setServerFilter] = useState("");
  const [worldFilter, setWorldFilter] = useState("");
  const [pingFilter, setPingFilter] = useState<MinecraftPingFilter>("all");
  const options = buildMinecraftPlayerFilterOptions(players, groupFilter);
  const filteredPlayers = filterMinecraftPlayers(players, {
    query,
    group: groupFilter,
    server: serverFilter,
    world: worldFilter,
    ping: pingFilter
  });
  const hasFilters = Boolean(query.trim() || groupFilter || serverFilter || worldFilter || pingFilter !== "all");

  function clearFilters() {
    setQuery("");
    setGroupFilter("");
    setServerFilter("");
    setWorldFilter("");
    setPingFilter("all");
  }

  return <article className="minecraft-control-panel minecraft-player-directory">
    <header>
      <div><span>PLAYER DIRECTORY</span><h2>Người chơi đang online</h2></div>
      <div className="minecraft-player-result"><span>Kết quả</span><strong>{filteredPlayers.length} / {players.length}</strong></div>
    </header>
    <div className="minecraft-control-player-tools">
      <label className="minecraft-control-search">
        <span className="sr-only">Tìm người chơi</span>
        <Search aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, UUID, cụm, backend, world..." />
      </label>
      <label className="minecraft-control-filter"><span>Cụm</span><select value={groupFilter} onChange={(event) => { setGroupFilter(event.target.value); setServerFilter(""); }}><option value="">Tất cả cụm</option>{options.groups.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="minecraft-control-filter"><span>Backend</span><select value={serverFilter} onChange={(event) => setServerFilter(event.target.value)}><option value="">Tất cả backend</option>{options.servers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="minecraft-control-filter"><span>World</span><select value={worldFilter} onChange={(event) => setWorldFilter(event.target.value)}><option value="">Tất cả world</option>{options.worlds.map((world) => <option key={world} value={world}>{world}</option>)}</select></label>
      <label className="minecraft-control-filter"><span>Ping</span><select value={pingFilter} onChange={(event) => setPingFilter(event.target.value as MinecraftPingFilter)}><option value="all">Tất cả ping</option><option value="excellent">Tối đa 50 ms</option><option value="good">51-100 ms</option><option value="slow">Trên 100 ms</option></select></label>
      <button type="button" className="minecraft-control-clear-filters" disabled={!hasFilters} onClick={clearFilters}><RotateCcw aria-hidden="true" />Xóa bộ lọc</button>
    </div>
    <div className="minecraft-control-table-wrap"><table><thead><tr><th>Player</th><th>Cụm / Backend</th><th>World</th><th>Ping</th></tr></thead><tbody>{filteredPlayers.map((player) => <tr key={`${player.serverId}-${player.uuid}`}><td><div className="minecraft-control-player"><MinecraftPlayerHead username={player.username} /><span><strong>{player.username}</strong><small>{player.uuid}</small></span></div></td><td><strong>{formatMinecraftLocation(player.groupLabel, player.serverLabel)}</strong><small>{player.serverId}</small></td><td>{player.world}</td><td>{player.ping} ms</td></tr>)}</tbody></table>{filteredPlayers.length === 0 ? <p className="minecraft-control-empty">Không có người chơi phù hợp.</p> : null}</div>
  </article>;
}
