/**
 * Camera-based parallax.
 * One shared camera (zoom + focus point) drives every layer; each layer reacts
 * proportionally to its depth factor `k` (1 = the world plate, >1 = closer to the lens).
 * Only transforms are written — no layout properties.
 */
export type Camera = {
  zoom: number;
  /** focus point in the world, stage-normalised (0–1) */
  fx: number;
  fy: number;
  /** where that focus point lands on screen, stage-normalised */
  sx: number;
  sy: number;
};

export type CameraLayer = {
  el: HTMLElement;
  /** depth factor */
  k: number;
  /** element centre in stage-normalised coordinates */
  px: number;
  py: number;
  /** extra per-layer scale multiplier */
  base?: number;
};

export const createCamera = (init: Partial<Camera> = {}): Camera => ({
  zoom: 1, fx: 0.5, fy: 0.5, sx: 0.5, sy: 0.5, ...init,
});

export function readLayers(root: HTMLElement, selector = "[data-cam]"): CameraLayer[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).map((el) => ({
    el,
    k: parseFloat(el.dataset.cam || "1"),
    px: parseFloat(el.dataset.x || "50") / 100,
    py: parseFloat(el.dataset.y || "50") / 100,
    base: parseFloat(el.dataset.base || "1"),
  }));
}

export function applyCamera(layers: CameraLayer[], cam: Camera, w: number, h: number) {
  for (const l of layers) {
    const z = (1 + (cam.zoom - 1) * l.k) * (l.base ?? 1);
    const zz = 1 + (cam.zoom - 1) * l.k;
    const nx = cam.sx + (l.px - cam.fx) * zz;
    const ny = cam.sy + (l.py - cam.fy) * zz;
    l.el.style.transform = `translate3d(${((nx - l.px) * w).toFixed(1)}px,${((ny - l.py) * h).toFixed(1)}px,0) scale(${z.toFixed(4)})`;
  }
}

/** Subtle pointer-driven parallax for idle depth (desktop, fine pointer only). */
export function pointerParallax(root: HTMLElement, layers: { el: HTMLElement; amount: number }[]) {
  let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  const move = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const tick = () => {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    for (const l of layers) l.el.style.translate = `${(-cx * l.amount).toFixed(2)}px ${(-cy * l.amount * 0.6).toFixed(2)}px`;
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
  };
  root.addEventListener("pointermove", move, { passive: true });
  return () => { root.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
}
