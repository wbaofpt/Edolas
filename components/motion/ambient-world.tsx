type AmbientWorldProps = {
  intensity?: "hero" | "page" | "auth";
};

export function AmbientWorld({ intensity = "page" }: AmbientWorldProps) {
  return (
    <div className={`ambient-world ambient-world--${intensity}`} aria-hidden="true">
      <div className="ambient-stars" data-motion-layer />
      <div className="ambient-mist ambient-mist--one" data-motion-layer />
      <div className="ambient-mist ambient-mist--two" data-motion-layer />
      <div className="ambient-orbit" data-motion-layer />
      <div className="ambient-motes" data-motion-layer>
        {Array.from({ length: 14 }, (_, index) => <span key={index} />)}
      </div>
    </div>
  );
}
