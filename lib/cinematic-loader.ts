export type CinematicStage = "playing" | "exiting" | "complete";
export type CinematicEvent = "progress-complete" | "exit-complete" | "skip";
export type CinematicProgressMode = "running" | "complete";
export type CinematicMotionState = "idle" | "running";

export function getInitialCinematicStage(): CinematicStage {
  return "playing";
}

export function getCinematicMotionState(started: boolean): CinematicMotionState {
  return started ? "running" : "idle";
}

export function advanceCinematicStage(stage: CinematicStage, event: CinematicEvent): CinematicStage {
  if (event === "skip") return "complete";
  if (stage === "playing" && event === "progress-complete") return "exiting";
  if (stage === "exiting" && event === "exit-complete") return "complete";
  return stage;
}

export function shouldAnimateCinematicProgress(stage: CinematicStage) {
  return getCinematicProgressMode(stage) === "running";
}

export function getCinematicProgressMode(stage: CinematicStage): CinematicProgressMode {
  if (stage === "playing") return "running";
  return "complete";
}

export function getCinematicDurations(reducedMotion: boolean) {
  return reducedMotion
    ? { play: 180, settle: 40, exit: 80 }
    : { play: 1_800, settle: 140, exit: 620 };
}
