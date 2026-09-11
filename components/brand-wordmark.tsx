type BrandWordmarkProps = {
  variant: "header" | "loader" | "hero";
};

export function BrandWordmark({ variant }: BrandWordmarkProps) {
  if (variant === "header") {
    return (
      <span className="brand-wordmark brand-wordmark--header" aria-hidden="true">
        <span className="brand-wordmark-emblem">
          <span className="brand-wordmark-emblem-letter">E</span>
        </span>
        <span className="brand-wordmark-header-copy">
          <span className="brand-wordmark-header-name">
            <span className="brand-wordmark-header-edolas">EDOLAS</span>
            <span className="brand-wordmark-header-divider" />
            <span className="brand-wordmark-header-sg">SG</span>
          </span>
          <span className="brand-wordmark-header-network">
            <span>MINECRAFT NETWORK</span>
            <span className="brand-wordmark-header-code">03</span>
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={`brand-wordmark brand-wordmark--${variant}`} aria-hidden="true">
      <span className="brand-wordmark-kicker">
        <span>MINECRAFT NETWORK</span>
        <span className="brand-wordmark-season"><span>{"//"}</span> SEASON 03</span>
      </span>
      <span className="brand-wordmark-name">
        <span className="brand-wordmark-piece brand-wordmark-edolas" data-text="EDOLAS">EDOLAS</span>
        <span className="brand-wordmark-piece brand-wordmark-sg" data-text="SG">SG</span>
      </span>
    </span>
  );
}
