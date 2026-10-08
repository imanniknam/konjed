import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { currentScene, scenes, smooth, unlockScroll, view } from "./registry";
import { buildArcade, buildFinal, buildHero, buildJourney, buildSchool, buildShowcase } from "./transitions";

/**
 * Centralised scroll system.
 * - one Lenis instance, driven by the GSAP ticker
 * - one matchMedia switch: cinematic (pinned scenes, desktop) / mobile (the same pinned story, portrait composition) / reduced (no motion)
 * - every scene's ScrollTrigger is registered here, so UI can jump to a point inside a scene
 * Components never create their own ScrollTriggers.
 */
export type JourneyMode = "cinematic" | "mobile" | "reduced";

export function createJourney(root: HTMLElement): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  const html = document.documentElement;

  mm.add(
    {
      // very short viewports (phone in landscape) can't hold a pinned 100svh composition → plain flow layout
      cinematic: "(min-width: 900px) and (min-height: 520px) and (prefers-reduced-motion: no-preference)",
      mobile: "(max-width: 899px) and (min-height: 520px) and (prefers-reduced-motion: no-preference)",
      reduced: "(prefers-reduced-motion: reduce), (max-height: 519px)",
    },
    (ctx) => {
      const c = ctx.conditions as Record<JourneyMode, boolean>;
      const mode: JourneyMode = c.cinematic ? "cinematic" : c.mobile ? "mobile" : "reduced";
      html.dataset.mode = mode;

      view.mobile = mode === "mobile";
      let tick: ((t: number) => void) | null = null;
      if (mode === "mobile") {
        // touch: scroll is normalised in JS so pinned scenes stay glued while the browser toolbar shows/hides
        ScrollTrigger.config({ ignoreMobileResize: true });
        smooth.normalizer = ScrollTrigger.normalizeScroll({ allowNestedScroll: true }) as unknown as typeof smooth.normalizer;
      } else if (mode === "cinematic") {
        const lenis = (smooth.lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true }));
        lenis.on("scroll", ScrollTrigger.update);
        tick = (t) => lenis.raf(t * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
      }

      // ambient state: overall journey progress + nav solidity
      ScrollTrigger.create({
        start: 0, end: "max",
        onUpdate: (s) => {
          html.style.setProperty("--journey", s.progress.toFixed(4));
          const id = currentScene();
          if (html.dataset.scene !== id) { html.dataset.scene = id; window.dispatchEvent(new CustomEvent("konjed:scene", { detail: { id } })); }
        },
      });
      ScrollTrigger.create({
        start: 40, end: "max",
        onToggle: (s) => { html.dataset.scrolled = s.isActive ? "true" : "false"; },
      });

      const scene = (id: string) => root.querySelector<HTMLElement>(`[data-scene="${id}"]`);
      if (mode !== "reduced") {
        const builders = { hero: buildHero, arcade: buildArcade, school: buildSchool, showcase: buildShowcase, journey: buildJourney, final: buildFinal };
        (Object.keys(builders) as (keyof typeof builders)[]).forEach((id) => {
          const el = scene(id);
          if (el) builders[id](el);
        });
      }

      // the story is wired: let the visitor in (stage images / HUD / sticky CTA key off this)
      requestAnimationFrame(() => {
        html.dataset.ready = "true";
        window.dispatchEvent(new Event("konjed:ready"));
        unlockScroll();
      });

      return () => {
        if (tick) gsap.ticker.remove(tick);
        smooth.lenis?.destroy();
        smooth.lenis = null;
        smooth.normalizer = null;
        ScrollTrigger.normalizeScroll(false);
        html.classList.remove("is-locked");
        view.mobile = false;
        scenes.clear();
        delete html.dataset.mode;
        delete html.dataset.scene;
      };
    },
  );

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh, { once: true });
  return () => { window.removeEventListener("load", refresh); mm.revert(); };
}
