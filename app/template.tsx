"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="route-portal"
        initial={{ opacity: reducedMotion ? 0 : 0.34, scaleX: reducedMotion ? 1 : 0.72 }}
        animate={{ opacity: 0, scaleX: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        initial={{ opacity: reducedMotion ? 1 : 0.78, scale: reducedMotion ? 1 : 0.995 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
