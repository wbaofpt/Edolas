import assert from "node:assert/strict";
import test from "node:test";
import { calculateTilt, getRevealOffset, shouldEnablePointerMotion } from "../lib/motion.ts";

test("pointer motion is enabled only for precise pointers without reduced motion", () => {
  assert.equal(shouldEnablePointerMotion(false, true), true);
  assert.equal(shouldEnablePointerMotion(true, true), false);
  assert.equal(shouldEnablePointerMotion(false, false), false);
});

test("tilt is centered and clamped to the requested intensity", () => {
  assert.deepEqual(calculateTilt({ x: 50, y: 50, width: 100, height: 100 }, 4), { rotateX: 0, rotateY: 0 });
  assert.deepEqual(calculateTilt({ x: 100, y: 0, width: 100, height: 100 }, 4), { rotateX: 4, rotateY: 4 });
  assert.deepEqual(calculateTilt({ x: 200, y: -100, width: 100, height: 100 }, 4), { rotateX: 4, rotateY: 4 });
});

test("reveal offsets map direction to a single transform axis", () => {
  assert.deepEqual(getRevealOffset("up", 24), { x: 0, y: 24 });
  assert.deepEqual(getRevealOffset("left", 24), { x: -24, y: 0 });
  assert.deepEqual(getRevealOffset("right", 24), { x: 24, y: 0 });
  assert.deepEqual(getRevealOffset("none", 24), { x: 0, y: 0 });
});
