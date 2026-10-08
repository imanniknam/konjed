import type { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

/** Shared handles for the scroll system (kept separate to avoid circular imports). */
type SceneHandle = { st: ScrollTrigger; duration: number };
export const scenes = new Map<string, SceneHandle>();
export const smooth: { lenis: Lenis | null; normalizer: { enable: () => void; disable: () => void } | null } = { lenis: null, normalizer: null };
/** Layout family the current scroll mode builds for (phones get the same pinned story in a portrait composition). */
export const view = { mobile: false };

export const registerScene = (id: string, st: ScrollTrigger, duration: number) => scenes.set(id, { st, duration });

/** Scroll to `time` (timeline units) inside a pinned scene. */
export function scrollToSceneTime(id: string, time: number) {
  const h = scenes.get(id);
  if (!h) return;
  const y = h.st.start + (h.st.end - h.st.start) * (time / h.duration);
  if (smooth.lenis) smooth.lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

export const lockScroll = () => { smooth.lenis?.stop(); smooth.normalizer?.disable(); if (!smooth.lenis) document.documentElement.classList.add("is-locked"); };
export const unlockScroll = () => { smooth.lenis?.start(); smooth.normalizer?.enable(); document.documentElement.classList.remove("is-locked"); };

export const SCENE_ORDER = ["hero", "arcade", "school", "showcase", "journey", "final"] as const;

/** Scroll position (px) where a scene starts, in either mode. */
export function sceneStartY(id: string): number | null {
  const h = scenes.get(id);
  if (h) return h.st.start;
  const el = document.querySelector<HTMLElement>(`[data-scene="${id}"]`);
  return el ? el.getBoundingClientRect().top + window.scrollY - 64 : null;
}
export function goToScene(id: string) {
  const y = sceneStartY(id);
  if (y == null) return;
  if (smooth.lenis) smooth.lenis.scrollTo(y, { duration: 1.6 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

/** Which scene is on screen right now (cinematic: by pinned range; flow: by viewport centre). */
export function currentScene(): string {
  if (scenes.size) {
    const y = window.scrollY;
    let cur: string = SCENE_ORDER[0];
    for (const id of SCENE_ORDER) { const h = scenes.get(id); if (h && y >= h.st.start - 2) cur = id; }
    return cur;
  }
  const mid = window.innerHeight * 0.45;
  let cur: string = SCENE_ORDER[0];
  for (const id of SCENE_ORDER) { const el = document.querySelector(`[data-scene="${id}"]`); if (el && el.getBoundingClientRect().top <= mid) cur = id; }
  return cur;
}
