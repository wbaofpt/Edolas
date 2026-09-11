import Image from "next/image";
import { TiltCard } from "@/components/motion/tilt-card";
import type { GameMode } from "@/lib/types";

export function GameModeCard({
  mode,
  index,
  titleAs: Title = "h3"
}: {
  mode: GameMode;
  index: number;
  titleAs?: "h2" | "h3";
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <TiltCard className="h-full">
      <article className={`mode-card group h-full${mode.bannerPath ? " mode-card--has-banner" : ""}`}>
        <div className="mode-card-visual">
          {mode.bannerPath ? (
            <Image
              src={mode.bannerPath}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="mode-card-banner"
              aria-hidden="true"
            />
          ) : <span className="mode-card-placeholder" aria-hidden="true" />}
          <span className="mode-card-shade" aria-hidden="true" />
          <span className="mode-card-glow" aria-hidden="true" />
          <div className="mode-card-meta">
            <span className="mode-index">MODE // {number}</span>
            <span className={`mode-card-status is-${mode.telemetry.status}`}>
              <span><i aria-hidden="true" />{mode.telemetry.status === "online" ? "ONLINE" : "OFFLINE"}</span>
              <b>{mode.telemetry.online} người chơi</b>
            </span>
          </div>
          <div className="mode-card-overlay">
            <div className={`mode-line bg-gradient-to-r ${mode.accent}`} />
            <Title className="mode-title">{mode.name}</Title>
            <p className="mode-summary">{mode.summary}</p>
            <div className="mode-features">
              {mode.features.map((feature) => (
                <span key={feature} className="tag-chip">{feature}</span>
              ))}
            </div>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
