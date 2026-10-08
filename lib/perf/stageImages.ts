import { SCENE_ORDER } from "@/lib/animations/registry";

/**
 * Progressive image loading for the homepage story.
 * Deferred images (`data-src`) are activated by scene proximity:
 *   - the current scene's images immediately (high priority),
 *   - everything else one group at a time in idle time once the page is ready, nearest scene first,
 *   - never in the background on Save-Data / 2G connections (only the next scene, on demand).
 */
type Group = { key: string; stage: number; nodes: HTMLImageElement[]; started: boolean; done: boolean };

const stageOf = (img: HTMLImageElement) => {
  const own = img.dataset.stage;
  if (own !== undefined && own !== "") return +own;
  const id = img.closest<HTMLElement>("[data-scene]")?.dataset.scene;
  const i = id ? SCENE_ORDER.indexOf(id as (typeof SCENE_ORDER)[number]) : 0;
  return i < 0 ? 0 : i;
};

export function stageImages(root: ParentNode = document): () => void {
  const groups = new Map<string, Group>();
  root.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => {
    const key = img.dataset.srcset || img.dataset.src || "";
    const g = groups.get(key) ?? { key, stage: 99, nodes: [], started: false, done: false };
    g.nodes.push(img); g.stage = Math.min(g.stage, stageOf(img));
    groups.set(key, g);
  });
  const queue = [...groups.values()].sort((a, b) => a.stage - b.stage);
  if (!queue.length) return () => {};

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const lean = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
  let cur = 0, inflight = 0, alive = true, timer = 0;
  const html = document.documentElement;

  const activate = (g: Group, priority: "high" | "low") => {
    if (g.started) return; g.started = true;
    let pending = g.nodes.length;
    const fin = () => { if (--pending <= 0) { g.done = true; if (priority === "low") inflight--; if (alive) schedule(); } };
    if (priority === "low") inflight++;
    for (const img of g.nodes) {
      img.fetchPriority = priority; // eslint-disable-line
      const pic = img.parentElement;
      if (pic?.tagName === "PICTURE") pic.querySelectorAll<HTMLSourceElement>("source[data-srcset]").forEach((s) => { s.srcset = s.dataset.srcset!; });
      img.addEventListener("load", () => { img.dataset.loaded = "true"; fin(); }, { once: true });
      img.addEventListener("error", () => { img.dataset.loaded = "true"; fin(); }, { once: true });
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.src = img.dataset.src!;
    }
  };

  const pump = () => {
    timer = 0;
    if (!alive) return;
    for (const g of queue) if (!g.started && g.stage <= cur) activate(g, "high");
    if (html.dataset.ready !== "true") return schedule(600);
    const limit = lean ? cur + 1 : 99;
    for (const g of queue) {
      if (inflight >= 2) break;
      if (!g.started && g.stage <= limit) activate(g, "low");
    }
  };
  const schedule = (ms = 120) => { if (!timer && alive) timer = window.setTimeout(pump, ms); };

  const onScene = (e: Event) => { const id = (e as CustomEvent<{ id: string }>).detail.id; cur = Math.max(cur, SCENE_ORDER.indexOf(id as (typeof SCENE_ORDER)[number])); pump(); };
  window.addEventListener("konjed:scene", onScene);
  schedule(400);
  return () => { alive = false; window.clearTimeout(timer); window.removeEventListener("konjed:scene", onScene); };
}
