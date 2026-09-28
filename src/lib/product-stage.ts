/**
 * Mutable interaction state shared between the DOM layer (scroll, pointer,
 * drag, wheel) and the WebGL render loop. Deliberately not React state — it is
 * read every frame inside useFrame, so re-rendering would be wasteful.
 */
export type StageState = {
  /** 0 → 1 across the whole page */
  progress: number;
  /** damped pointer position, -1 → 1 */
  pointerX: number;
  pointerY: number;
  /** accumulated drag rotation, radians */
  dragYaw: number;
  dragPitch: number;
  /** user wheel zoom, clamped */
  zoom: number;
  dragging: boolean;
};

export const stage: StageState = {
  progress: 0,
  pointerX: 0,
  pointerY: 0,
  dragYaw: 0,
  dragPitch: 0,
  zoom: 0,
  dragging: false,
};

export type Keyframe = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

/** One keyframe per section — the product is animated between them on scroll. */
export const KEYFRAMES: Keyframe[] = [
  // Hero — right of the headline, three-quarter view
  { position: [0.72, 0.05, -0.3], rotation: [0.12, -0.42, 0.05], scale: 0.7 },
  // Craft — pushed left, tilted to show the case flank
  { position: [-1.05, 0.0, 0.5], rotation: [0.42, 0.55, -0.12], scale: 0.9 },
  // Variants — right, near-flat dial view
  { position: [1.0, 0.0, 0.3], rotation: [-0.08, -0.25, 0.1], scale: 0.85 },
  // Movement — centred, close, rotated to the caseback
  { position: [0, -0.05, 0.85], rotation: [0.18, -1.15, 0.05], scale: 0.9 },
  // Collection — centred and settled
  { position: [0, 0.35, -0.5], rotation: [0.1, -0.35, 0], scale: 0.72 },
];

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
