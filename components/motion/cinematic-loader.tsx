"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandWordmark } from "@/components/brand-wordmark";
import {
  advanceCinematicStage,
  getCinematicProgressMode,
  getCinematicDurations,
  getCinematicMotionState,
  getInitialCinematicStage,
  type CinematicStage
} from "@/lib/cinematic-loader";

export function CinematicLoader() {
  const reducedMotion = useReducedMotion() ?? false;
  const durations = getCinematicDurations(reducedMotion);
  const [stage, setStage] = useState<CinematicStage>(getInitialCinematicStage);
  const [motionStarted, setMotionStarted] = useState(false);
  const timers = useRef<number[]>([]);
  const exitStarted = useRef(false);

  useEffect(() => {
    const startFrame = window.requestAnimationFrame(() => setMotionStarted(true));

    return () => {
      window.cancelAnimationFrame(startFrame);
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    if (stage === "complete") return;

    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [stage]);

  function skip() {
    exitStarted.current = true;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];

    setStage((current) => advanceCinematicStage(current, "skip"));
  }

  function beginExit() {
    if (stage !== "playing" || exitStarted.current) return;
    exitStarted.current = true;

    const settleTimer = window.setTimeout(() => {
      setStage((current) => advanceCinematicStage(current, "progress-complete"));

      const exitTimer = window.setTimeout(
        () => setStage((current) => advanceCinematicStage(current, "exit-complete")),
        durations.exit
      );
      timers.current.push(exitTimer);
    }, durations.settle);
    timers.current.push(settleTimer);
  }

  const shutterTransition = {
    duration: durations.exit / 1000,
    ease: [0.76, 0, 0.24, 1] as const
  };
  const progressMode = getCinematicProgressMode(stage);
  const motionState = getCinematicMotionState(motionStarted);
  const loaderStyle = {
    "--cinematic-play-duration": `${durations.play}ms`
  } as CSSProperties;

  return (
    <AnimatePresence>
      {stage !== "complete" ? (
        <motion.div
          className="cinematic-loader"
          data-stage={stage}
          data-motion={motionState}
          style={loaderStyle}
          aria-busy="true"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.08 : 0.16, ease: "easeOut" }}
        >
          <div className="cinematic-loader-sky" aria-hidden="true" />
          <div className="cinematic-loader-stars" aria-hidden="true" />
          <div className="cinematic-loader-terrain cinematic-loader-terrain-far" aria-hidden="true" />
          <div className="cinematic-loader-terrain cinematic-loader-terrain-near" aria-hidden="true" />

          <div className="cinematic-loader-motes" aria-hidden="true">
            {Array.from({ length: reducedMotion ? 0 : 12 }, (_, index) => <span key={index} />)}
          </div>

          <div className="cinematic-loader-brand">
            <BrandWordmark variant="loader" />
            <div className="cinematic-loader-progress" aria-hidden="true">
              <motion.span
                className={`cinematic-loader-progress-fill${progressMode === "complete" ? " is-complete" : ""}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: motionStarted ? 1 : 0 }}
                transition={{
                  duration: motionStarted ? durations.play / 1000 : 0,
                  ease: "linear"
                }}
                onAnimationComplete={() => {
                  if (motionStarted && progressMode === "running") beginExit();
                }}
              />
            </div>
          </div>

          <p role="status" aria-live="polite" className="cinematic-loader-status">
            Đang mở cổng Edolas
          </p>

          <button
            type="button"
            onClick={skip}
            className="cinematic-loader-skip focus-ring"
          >
            Bỏ qua
          </button>

          <motion.div
            className="cinematic-loader-shutter cinematic-loader-shutter-left"
            animate={{
              x: stage === "exiting" ? "-100%" : "0%",
              opacity: stage === "exiting" ? 0 : 1
            }}
            transition={shutterTransition}
            aria-hidden="true"
          />
          <motion.div
            className="cinematic-loader-shutter cinematic-loader-shutter-right"
            animate={{
              x: stage === "exiting" ? "100%" : "0%",
              opacity: stage === "exiting" ? 0 : 1
            }}
            transition={shutterTransition}
            aria-hidden="true"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
