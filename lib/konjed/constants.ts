/** Breakpoints (px) — based on actual layout needs, not device names. */
export const BREAKPOINTS = { compact: 600, tablet: 900, desktop: 1100 } as const;

/**
 * Conceptual journey timeline (0–1 of total homepage scroll).
 * Real values are derived from each scene's pinned length at runtime;
 * these markers document the intended story beats.
 */
export const JOURNEY_BEATS = {
  hero: 0.0,
  heroCamera: 0.08,
  worldTransition: 0.17,
  arcade: 0.22,
  gameSelection: 0.34,
  skillSchool: 0.46,
  showcase: 0.62,
  howItWorks: 0.78,
  finalWorld: 0.9,
  finalCta: 1.0,
} as const;

/** Scroll length of each pinned scene, in viewport heights. */
export const SCENE_LENGTH_VH = {
  hero: 2.6,
  arcade: 3.4,
  school: 2.2,
  showcase: 3.2,
  journey: 2.4,
  final: 1.6,
} as const;

/** Depth layers → relative travel (higher = closer to camera = moves more). */
export const DEPTH = { sky: 0.06, far: 0.14, mid: 0.3, near: 0.62, fore: 1 } as const;

export const SCENE_IDS = ["hero", "arcade", "school", "showcase", "journey", "final"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export const EASE = { out: "power3.out", inOut: "power2.inOut", cinematic: "expo.inOut", scrub: "none" } as const;
