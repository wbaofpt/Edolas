import type { ReactNode } from "react";

export function CinematicPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`cinematic-page ${className}`}>
      <div className="cinematic-page-horizon" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
