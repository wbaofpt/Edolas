"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { getRevealOffset, type RevealDirection } from "@/lib/motion";

const cinematicEase = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  amount?: number;
};

export function Reveal({ children, className = "", delay = 0, direction = "up", amount = 0.2 }: RevealProps) {
  const reducedMotion = useReducedMotion();
  const offset = getRevealOffset(direction, reducedMotion ? 0 : 24);

  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: reducedMotion ? 0 : 0.62, delay: reducedMotion ? 0 : delay, ease: cinematicEase }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

export function StaggerGroup({ children, className = "" }: StaggerProps) {
  const reducedMotion = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: reducedMotion ? 0 : 0.07, delayChildren: reducedMotion ? 0 : 0.06 } }
  };

  return (
    <motion.div variants={variants} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.12 }} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: StaggerProps) {
  const reducedMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 },
    shown: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.54, ease: cinematicEase } }
  };

  return <motion.div variants={variants} className={className}>{children}</motion.div>;
}
