"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { calculateTilt, shouldEnablePointerMotion } from "@/lib/motion";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
};

export function TiltCard({ children, className = "", intensity = 4 }: TiltCardProps) {
  const reducedMotion = useReducedMotion();
  const [precisePointer, setPrecisePointer] = useState(false);
  const bounds = useRef<DOMRect | null>(null);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 220, damping: 24, mass: 0.7 });
  const rotateY = useSpring(rawRotateY, { stiffness: 220, damping: 24, mass: 0.7 });
  const enabled = shouldEnablePointerMotion(Boolean(reducedMotion), precisePointer);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const update = () => setPrecisePointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (!enabled) return;
    bounds.current = event.currentTarget.getBoundingClientRect();
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || !bounds.current) return;
    const tilt = calculateTilt({
      x: event.clientX - bounds.current.left,
      y: event.clientY - bounds.current.top,
      width: bounds.current.width,
      height: bounds.current.height
    }, intensity);
    rawRotateX.set(tilt.rotateX);
    rawRotateY.set(tilt.rotateY);
  }

  function reset() {
    bounds.current = null;
    rawRotateX.set(0);
    rawRotateY.set(0);
  }

  return (
    <motion.div
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
