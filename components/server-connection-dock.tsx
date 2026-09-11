"use client";

import { Check, Copy, Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MinecraftNetworkStatus } from "@/components/minecraft-network-status";
import type { PublicMinecraftStatus } from "@/lib/minecraft/public-status";

type ServerEdition = "java" | "bedrock";

type ServerConnectionDockProps = {
  javaIp: string;
  bedrockIp: string;
  bedrockPort: string;
  initialStatus: PublicMinecraftStatus | null;
};

export function ServerConnectionDock({ javaIp, bedrockIp, bedrockPort, initialStatus }: ServerConnectionDockProps) {
  const [copiedEdition, setCopiedEdition] = useState<ServerEdition | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function copyAddress(edition: ServerEdition, address: string, label: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedEdition(edition);
      setAnnouncement(`Đã sao chép địa chỉ ${label}.`);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopiedEdition(null), 1800);
    } catch {
      setAnnouncement(`Không thể sao chép địa chỉ ${label}.`);
    }
  }

  const bedrockAddress = `${bedrockIp}:${bedrockPort}`;

  return (
    <section className="server-connection-dock" aria-labelledby="server-connection-title">
      <header className="connection-dock-heading">
        <div>
          <p className="connection-dock-kicker">Cổng kết nối</p>
          <h2 id="server-connection-title">Chọn phiên bản của bạn</h2>
        </div>
        <MinecraftNetworkStatus initialStatus={initialStatus} />
      </header>

      <div className="connection-channel-grid">
        <article className="connection-channel is-java">
          <div className="connection-channel-icon" aria-hidden="true"><Monitor /></div>
          <div className="connection-channel-details">
            <p className="connection-channel-edition">PC / JAVA</p>
            <code>{javaIp}</code>
            <span>Java Edition</span>
          </div>
          <button
            type="button"
            className="connection-copy-button focus-ring"
            onClick={() => copyAddress("java", javaIp, "Java")}
            aria-label={`Sao chép địa chỉ Java ${javaIp}`}
          >
            {copiedEdition === "java" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copiedEdition === "java" ? "Đã chép" : "Sao chép"}</span>
          </button>
        </article>

        <article className="connection-channel is-bedrock">
          <div className="connection-channel-icon" aria-hidden="true"><Smartphone /></div>
          <div className="connection-channel-details">
            <p className="connection-channel-edition">PE / BEDROCK</p>
            <code>{bedrockIp}</code>
            <span>Bedrock Edition · Port {bedrockPort}</span>
          </div>
          <button
            type="button"
            className="connection-copy-button focus-ring"
            onClick={() => copyAddress("bedrock", bedrockAddress, "Bedrock")}
            aria-label={`Sao chép địa chỉ Bedrock ${bedrockAddress}`}
          >
            {copiedEdition === "bedrock" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copiedEdition === "bedrock" ? "Đã chép" : "Sao chép"}</span>
          </button>
        </article>
      </div>

      <p className="sr-only" aria-live="polite">{announcement}</p>
    </section>
  );
}
