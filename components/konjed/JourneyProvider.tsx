"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { stageImages } from "@/lib/perf/stageImages";
import { JourneyHud } from "./JourneyHud";

/**
 * Mounts the centralised scroll system over the homepage and tears it all down on unmount.
 * GSAP + ScrollTrigger + Lenis are fetched as a separate chunk right after hydration, so they never
 * block the first paint / LCP. The page is held still (not hidden) until the scroll system is up.
 */
export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    import("@/lib/animations/scrollTimeline")
      .then((m) => { if (!dead) off = m.createJourney(root.current!); })
      .catch(() => { const h = document.documentElement; h.dataset.mode = "reduced"; h.dataset.ready = "true"; h.classList.remove("is-locked"); });
    return () => { dead = true; off?.(); };
  }, []);
  useEffect(() => stageImages(root.current ?? document), []);
  return <div ref={root} className="journey">{children}<JourneyHud /></div>;
}
