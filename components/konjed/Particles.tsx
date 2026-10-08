"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient motes. A tiny 2D canvas — not WebGL — because nothing here needs a 3D pipeline.
 * Paused when the tab is hidden; not rendered at all for reduced-motion users.
 */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf = 0, last = 0;
    const small = window.innerWidth < 900;
    const N = small ? 14 : 36;
    const motes = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8,
      s: 0.006 + Math.random() * 0.02, a: 0.2 + Math.random() * 0.5, p: Math.random() * 6.28,
    }));
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return; // ~30fps is plenty for slow motes
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.y -= m.s * 0.033; m.x += Math.sin(t / 2600 + m.p) * 0.0003;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        const tw = 0.6 + 0.4 * Math.sin(t / 700 + m.p);
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,226,150,${(m.a * tw).toFixed(3)})`;
        ctx.arc(m.x * w, m.y * h, m.r, 0, 6.283);
        ctx.fill();
      }
    };
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); };
    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
