import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";

type AnimatedCardProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function AnimatedCard({ children, delay = 0, className = "" }: AnimatedCardProps) {
  return (
    <Reveal delay={delay} className={className}>
      {children}
    </Reveal>
  );
}
