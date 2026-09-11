export type RevealDirection = "up" | "left" | "right" | "none";

export type PointerBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function shouldEnablePointerMotion(reducedMotion: boolean, precisePointer: boolean) {
  return !reducedMotion && precisePointer;
}

export function getRevealOffset(direction: RevealDirection, distance: number) {
  if (direction === "left") return { x: -distance, y: 0 };
  if (direction === "right") return { x: distance, y: 0 };
  if (direction === "up") return { x: 0, y: distance };
  return { x: 0, y: 0 };
}

export function calculateTilt(box: PointerBox, intensity: number) {
  const normalizedX = Math.max(-1, Math.min(1, (box.x / box.width - 0.5) * 2));
  const normalizedY = Math.max(-1, Math.min(1, (0.5 - box.y / box.height) * 2));
  return {
    rotateX: normalizedY * intensity,
    rotateY: normalizedX * intensity
  };
}
