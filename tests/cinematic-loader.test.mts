import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  advanceCinematicStage,
  getCinematicProgressMode,
  getCinematicDurations,
  getInitialCinematicStage,
  getCinematicMotionState,
  shouldAnimateCinematicProgress,
} from "../lib/cinematic-loader.ts";

test("loader starts with a running progress bar on every mount", () => {
  const initialStage = getInitialCinematicStage();
  assert.equal(initialStage, "playing");
  assert.equal(getCinematicProgressMode(initialStage), "running");
});

test("cinematic motion waits for the first client frame", () => {
  assert.equal(getCinematicMotionState(false), "idle");
  assert.equal(getCinematicMotionState(true), "running");
});

test("cinematic loader shortens both stages for reduced motion", () => {
  assert.deepEqual(getCinematicDurations(false), { play: 1_800, settle: 140, exit: 620 });
  assert.deepEqual(getCinematicDurations(true), { play: 180, settle: 40, exit: 80 });
});

test("cinematic loader opens only after progress completes", () => {
  assert.equal(advanceCinematicStage("playing", "progress-complete"), "exiting");
  assert.equal(advanceCinematicStage("exiting", "exit-complete"), "complete");
});

test("progress animation runs only during the playing stage", () => {
  assert.equal(shouldAnimateCinematicProgress("playing"), true);
  assert.equal(shouldAnimateCinematicProgress("exiting"), false);
});

test("progress uses one continuous bar from running to complete", () => {
  assert.equal(getCinematicProgressMode("playing"), "running");
  assert.equal(getCinematicProgressMode("exiting"), "complete");
  assert.equal(getCinematicProgressMode("complete"), "complete");
});
