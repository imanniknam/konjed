import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, SCENE_LENGTH_VH } from "@/lib/konjed/constants";
import { applyCamera, createCamera, pointerParallax, readLayers } from "./parallax";
import { registerScene, scrollToSceneTime, view } from "./registry";

/**
 * Scene builders. Each cinematic scene is ONE pinned, scrubbed timeline.
 * The last beat of every timeline reveals the next scene's backdrop (`[data-gate]`),
 * which ends in exactly the state that next scene starts from — so scenes
 * transform into each other instead of cutting or cross-fading.
 */

const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function pinned(scene: HTMLElement, id: keyof typeof SCENE_LENGTH_VH, duration: number, extra: ScrollTrigger.Vars = {}) {
  // A finished scene is hidden the instant the next one takes over. The next scene's first frame
  // is identical to this scene's last frame, so the hand-off is invisible (no slide, no cut).
  const hasNext = id !== "final";
  const { onRefresh, ...rest } = extra;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: scene, start: "top top", end: `+=${SCENE_LENGTH_VH[id] * 100 * (view.mobile ? 0.85 : 1)}%`,
      pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
      onLeave: () => { if (hasNext) scene.style.visibility = "hidden"; },
      onEnterBack: () => { scene.style.visibility = ""; },
      onRefresh: (self) => {
        scene.style.visibility = hasNext && self.progress >= 1 ? "hidden" : "";
        onRefresh?.(self);
      },
      ...rest,
    },
  });
  tl.set({}, {}, duration); // pad so timeline length == declared duration
  registerScene(id, tl.scrollTrigger as ScrollTrigger, duration);
  return tl;
}

/* ───────────────────────── 01 HERO ───────────────────────── */
export function buildHero(scene: HTMLElement) {
  const stage = $(scene, ".stage")!;
  const layers = readLayers(stage);
  const content = $(scene, "[data-h=content]")!;
  const hint = $(scene, "[data-h=hint]");
  const shade = $(scene, "[data-h=shade]");
  const portal = $(scene, "[data-h=portal]")!;
  const portalImg = $(portal, "img");
  const rush = $$(stage, ".rush");
  const frame = $$(stage, ".fore:not(.rush)");

  // focus on the boy (stage-normalised); zoom 1 = identity
  const cam = createCamera({ fx: 0.24, fy: 0.56, sx: 0.24, sy: 0.56 });
  let w = stage.clientWidth, h = stage.clientHeight;
  const render = () => applyCamera(layers, cam, w, h);

  const tl = pinned(scene, "hero", 10, {
    onRefresh: () => { w = stage.clientWidth; h = stage.clientHeight; render(); },
  });
  tl.eventCallback("onUpdate", render);

  // A — camera pushes toward the character (world grows around him)
  tl.to(cam, { zoom: 1.35, duration: 3, ease: "power1.inOut" }, 0);
  // B — camera slides past him; he exits frame, the castle swells to centre
  tl.to(cam, { zoom: 2.3, fx: 0.58, fy: 0.34, sx: 0.5, sy: 0.46, duration: 4.6, ease: "power2.in" }, 3);
  tl.to(frame, { opacity: 0, duration: 1.6 }, 3.2);
  tl.to(rush, { opacity: 1, duration: 1.5, stagger: 0.18 }, 4.6);

  tl.to(content, { y: -110, opacity: 0, duration: 2.4, ease: "power2.in" }, 0.2);
  if (hint) tl.to(hint, { opacity: 0, duration: 0.7 }, 0);
  if (shade) tl.to(shade, { opacity: 0, duration: 2.4 }, 1.2);

  // C — break through the clouds into the arcade (iris opens inside the cloud wall)
  tl.fromTo(portal, { clipPath: "circle(0% at 50% 52%)" }, { clipPath: "circle(82% at 50% 52%)", duration: 2.8, ease: "power2.inOut" }, 6.6);
  if (portalImg) tl.fromTo(portalImg, { scale: 1.4 }, { scale: 1, duration: 3, ease: "power3.out" }, 6.6);
  tl.to(rush, { opacity: 0, duration: 1.2, stagger: 0.12 }, 8.5);

  const off = pointerParallax(stage, $$(stage, "[data-pp]").map((el) => ({ el: (el.firstElementChild as HTMLElement) || el, amount: parseFloat(el.dataset.pp || "10") })));
  return () => off();
}

/* ───────────────────────── 02 ARCADE ───────────────────────── */
export function buildArcade(scene: HTMLElement) {
  const bg = $(scene, ".backdrop img");
  const head = $(scene, "[data-a=head]")!;
  const cabs = $$(scene, "[data-cab]");
  const dots = $$(scene, "[data-dot]");
  const gate = $(scene, "[data-gate]")!;
  const gateImg = $(gate, "img");
  const D = 14;
  const slots = [3.6, 6.8, 10.0]; // when each game is "pulled to the lens"
  const spread = cabs.length === 3 ? [-1, 0, 1] : cabs.map((_, i) => i - 1);

  const tl = pinned(scene, "arcade", D);
  const mobile = view.mobile;

  if (bg) tl.fromTo(bg, { scale: 1 }, { scale: 1.12, duration: 12, ease: "none" }, 0);
  tl.fromTo($$(head, "[data-reveal]"), { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, stagger: 0.25, ease: EASE.out }, 0.1);

  if (mobile) {
    // portrait: the cabinets queue up out of the depth and pass the lens one by one
    cabs.forEach((cab, i) => {
      const at = slots[i] - 2.3;
      tl.fromTo(cab, { xPercent: -135, z: -700, y: 40, opacity: 0, rotateY: 38 }, { xPercent: 0, z: 0, y: 0, opacity: 1, rotateY: 0, duration: 1.9, ease: "power3.out" }, Math.max(0.9, at));
      if (i < cabs.length - 1) tl.to(cab, { xPercent: 135, z: -700, y: 40, opacity: 0, rotateY: -38, duration: 1.7, ease: "power2.in" }, slots[i] + 1.1);
    });
  } else {
    // cabinets arrive out of the depth, mirrored fan-out
    cabs.forEach((cab, i) => {
      const side = spread[i];
      tl.fromTo(cab, { z: -1500, y: 180, opacity: 0, rotateY: -side * 28 }, { z: 0, y: 0, opacity: 1, rotateY: -side * 7, duration: 2.6, ease: "power3.out" }, 0.9 + i * 0.45);
    });

    // selection: chosen game moves toward viewer, others recede
    slots.forEach((at, sel) => {
      cabs.forEach((cab, i) => {
        const on = i === sel;
        tl.to(cab, {
          z: on ? 70 : -90, scale: on ? 1.05 : 0.95, y: on ? -14 : 6,
          rotateY: on ? 0 : -spread[i] * 12, duration: 1.3, ease: "power2.inOut", overwrite: "auto",
        }, at);
      });
    });
  }

  // exit — the machines drift back into the dark, school light sweeps in
  tl.to(cabs, { z: -900, y: 80, opacity: 0, duration: 1.6, stagger: 0.12, ease: "power2.in" }, 12);
  tl.to(head, { y: -60, opacity: 0, duration: 1.2, ease: "power2.in" }, 12);
  tl.fromTo(gate, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: "power2.inOut" }, 12.1);
  if (gateImg) tl.fromTo(gateImg, { xPercent: -9, scale: 1.14 }, { xPercent: 0, scale: 1, duration: 1.8, ease: "power2.inOut" }, 12.1);

  const setActive = () => {
    const t = tl.time();
    const idx = t < slots[0] - 0.2 || t > 12 ? -1 : t < (slots[0] + slots[1]) / 2 + 0.4 ? 0 : t < (slots[1] + slots[2]) / 2 + 0.4 ? 1 : 2;
    cabs.forEach((c, i) => { c.dataset.active = String(i === idx); });
    dots.forEach((d, i) => d.setAttribute("aria-current", String(i === idx)));
  };
  tl.eventCallback("onUpdate", setActive);
  setActive();

  const cleanups: (() => void)[] = [];
  if (mobile) {
    const jumpTo = (i: number) => scrollToSceneTime("arcade", slots[i] + 0.9);
    dots.forEach((d, i) => { const h = () => jumpTo(i); d.addEventListener("click", h); cleanups.push(() => d.removeEventListener("click", h)); });
    return () => cleanups.forEach((f) => f());
  }
  // gentle pointer tilt on the cabinet under the cursor (inner element only, so it never fights the scroll transforms)
  const stage = $(scene, ".stage")!;
  const inners = cabs.map((c) => $(c, ".cab__inner")!);
  const tilt = (e: PointerEvent) => cabs.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    const on = Math.abs(dx) < 0.7 && Math.abs(dy) < 0.7 && c.dataset.active === "true";
    inners[i].style.transform = on ? `rotateY(${(-dx * 9).toFixed(2)}deg) rotateX(${(dy * 7).toFixed(2)}deg)` : "";
  });
  const untilt = () => inners.forEach((n) => { n.style.transform = ""; });
  stage.addEventListener("pointermove", tilt, { passive: true });
  stage.addEventListener("pointerleave", untilt);
  cleanups.push(() => { stage.removeEventListener("pointermove", tilt); stage.removeEventListener("pointerleave", untilt); });
  const jump = (i: number) => scrollToSceneTime("arcade", slots[i] + 0.9);
  cabs.forEach((c, i) => {
    const h = () => jump(i);
    c.addEventListener("click", h);
    c.addEventListener("focusin", () => { if (c.dataset.active !== "true") h(); });
    cleanups.push(() => c.removeEventListener("click", h));
  });
  dots.forEach((d, i) => { const h = () => jump(i); d.addEventListener("click", h); cleanups.push(() => d.removeEventListener("click", h)); });
  return () => cleanups.forEach((f) => f());
}

/* ───────────────────────── 03 SKILL SCHOOL ───────────────────────── */
export function buildSchool(scene: HTMLElement) {
  const bg = $(scene, ".backdrop img");
  const head = $(scene, "[data-s=head]")!;
  const course = $(scene, "[data-s=course]")!;
  const peek = $(scene, "[data-s=peek]");
  const props = $$(scene, "[data-s=prop]");
  const gate = $(scene, "[data-gate]")!;
  const gateImg = $(gate, "img");
  const D = 10;
  const tl = pinned(scene, "school", D);

  if (bg) tl.fromTo(bg, { scale: 1, yPercent: 0 }, { scale: 1.1, yPercent: -2, duration: 8, ease: "none" }, 0);
  tl.fromTo($$(head, "[data-reveal]"), { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 1.3, stagger: 0.22, ease: EASE.out }, 0.1);
  if (peek) tl.fromTo(peek, { x: -120, rotateY: 24, opacity: 0 }, { x: 0, rotateY: -8, opacity: 1, duration: 2, ease: EASE.out }, 0.8);
  tl.fromTo(course, { y: 120, rotateX: 28, opacity: 0, transformPerspective: 900 }, { y: 0, rotateX: 0, opacity: 1, duration: 2, ease: EASE.out }, 2);
  props.forEach((p, i) => {
    const depth = parseFloat(p.dataset.depth || "1");
    tl.fromTo(p, { y: (view.mobile ? 90 : 160) * depth, opacity: 0 }, { y: -40 * depth, opacity: 1, duration: 5, ease: "power1.out" }, 0.4 + i * 0.25);
    tl.to(p, { y: -190 * depth, opacity: 0, duration: 1.8, ease: "power1.in" }, 7.9);
  });

  // exit — the camera lifts away; the night gallery rises from below
  tl.to([head, course, peek].filter(Boolean) as HTMLElement[], { y: -80, opacity: 0, duration: 1.4, ease: "power2.in", stagger: 0.08 }, 7.9);
  tl.fromTo(gate, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.9, ease: "power2.inOut" }, 8);
  if (gateImg) tl.fromTo(gateImg, { yPercent: 14, scale: 1.18 }, { yPercent: 0, scale: 1, duration: 1.9, ease: "power2.inOut" }, 8);
}

/* ───────────────────────── 04 STUDENT SHOWCASE ───────────────────────── */
export function buildShowcase(scene: HTMLElement) {
  const stage = $(scene, ".stage")!;
  const head = $(scene, "[data-sh=head]")!;
  const cards = $$(scene, "[data-pcard]");
  const bg = $(scene, ".backdrop img");
  const gate = $(scene, "[data-gate]")!;
  const gateImg = $(gate, "img");
  const D = 12;
  const GAP = 640;
  const n = cards.length;
  const state = { cam: -2000, reveal: 0 };
  let w = stage.clientWidth;

  const place = () => {
    cards.forEach((card, i) => {
      const z = state.cam - i * GAP - 260; // 0 = card at the lens
      const side = i % 2 === 0 ? 1 : -1;
      const near = clamp(1 - Math.abs(z + 140) / 900);         // 1 when the card is "selected"
      const x = side * w * (view.mobile ? 0.16 : 0.3) * (1 - smooth(near));
      const y = side * 34 * (1 - near);
      const op = clamp((z + 2600) / 900) * (view.mobile ? clamp((340 - z) / 300) : clamp((620 - z) / 420)) * state.reveal;
      const blur = clamp((-z - 800) / 900) * 3.2;
      card.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${(-side * 9 * (1 - near)).toFixed(2)}deg)`;
      card.style.opacity = op.toFixed(3);
      card.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";
      card.style.pointerEvents = op > 0.5 ? "auto" : "none";
      card.dataset.active = String(near > 0.55);
      card.style.zIndex = String(1000 + Math.round(z));
    });
  };

  const tl = pinned(scene, "showcase", D, { onRefresh: () => { w = stage.clientWidth; place(); } });
  place();
  tl.eventCallback("onUpdate", place);

  if (bg) tl.fromTo(bg, { scale: 1.02 }, { scale: 1.16, duration: 10, ease: "none" }, 0);
  tl.fromTo($$(head, "[data-reveal]"), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.2, ease: EASE.out }, 0.1);
  // the headline clears the stage completely before the first card materialises, so text and cards never share space
  tl.to(head, { opacity: 0, y: -30, duration: 1, ease: "power2.in" }, 1.7);
  tl.fromTo(state, { reveal: 0 }, { reveal: 1, duration: 0.9, ease: "none" }, 2.7);
  tl.fromTo(state, { cam: -2000 }, { cam: (n - 1) * GAP + (view.mobile ? 560 : 1300), duration: 10, ease: "none" }, 0.3);

  // exit — dive out of the gallery into the star-lit path
  tl.fromTo(gate, { clipPath: "circle(0% at 50% 100%)" }, { clipPath: "circle(145% at 50% 100%)", duration: 1.8, ease: "power2.inOut" }, 10.2);
  if (gateImg) tl.fromTo(gateImg, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: "power2.out" }, 10.2);
}

/* ───────────────────────── 05 HOW IT WORKS ───────────────────────── */
export function buildJourney(scene: HTMLElement) {
  const head = $(scene, "[data-j=head]")!;
  const steps = $$(scene, "[data-step]");
  const path = $<HTMLElement>(scene, "[data-j=path] path") as unknown as SVGPathElement | null;
  const ribbon = $(scene, "[data-j=ribbon]");
  const wrap = $(scene, "[data-j=wrap]")!;
  const gate = $(scene, "[data-gate]")!;
  const gateImg = $(gate, "img");
  const D = 12;
  const tl = pinned(scene, "journey", D);

  tl.fromTo($$(head, "[data-reveal]"), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.2, ease: EASE.out }, 0.1);
  if (path && !view.mobile) {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(path, { strokeDashoffset: 0, duration: 7.6, ease: "none" }, 1.4);
  }
  steps.forEach((s, i) => {
    const at = (view.mobile ? 1.1 : 1.4) + i * (view.mobile ? 1.95 : 1.9);
    const art = $(s, "[data-art]");
    const pad = $(s, "[data-pad]");
    tl.fromTo(pad, { scaleX: 0.3, scaleY: 0.3, opacity: 0 }, { scaleX: 1, scaleY: 1, opacity: 1, duration: 0.9, ease: "back.out(1.7)" }, at);
    tl.fromTo(art, { y: view.mobile ? -130 : -240, scale: 0.4, rotate: -14, opacity: 0 }, { y: 0, scale: 1, rotate: 0, opacity: 1, duration: 1.3, ease: "bounce.out" }, at + 0.15);
    tl.fromTo($$(s, "[data-copy]"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: EASE.out }, at + 0.7);
  });
  if (ribbon) tl.fromTo(ribbon, { xPercent: 130, rotate: 6 }, { xPercent: 0, rotate: -1.4, duration: 1.4, ease: "back.out(1.3)" }, 9.4);

  // exit — we land back on the cliff: sunset world drops in from above
  tl.to(wrap, { y: 90, opacity: 0, duration: 1.3, ease: "power2.in" }, 10.3);
  tl.fromTo(gate, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "power2.inOut" }, 10.4);
  if (gateImg) tl.fromTo(gateImg, { yPercent: -10, scale: 1.45 }, { yPercent: 0, scale: 1.35, duration: 1.6, ease: "power2.inOut" }, 10.4);
}

/* ───────────────────────── 06 FINAL ───────────────────────── */
export function buildFinal(scene: HTMLElement) {
  const stage = $(scene, ".stage")!;
  const layers = readLayers(stage);
  const lines = $$(scene, "[data-f=line]");
  const cta = $(scene, "[data-f=cta]");
  const D = 6;
  // starts where the journey left off: close on the boy, then the camera pulls back into the world
  const cam = createCamera({ fx: 0.27, fy: 0.45, sx: 0.27, sy: 0.45, zoom: 1.35 });
  let w = stage.clientWidth, h = stage.clientHeight;
  const render = () => applyCamera(layers, cam, w, h);
  const tl = pinned(scene, "final", D, { onRefresh: () => { w = stage.clientWidth; h = stage.clientHeight; render(); } });
  render();
  tl.eventCallback("onUpdate", render);
  tl.to(cam, { zoom: 1, sx: 0.27, sy: 0.45, duration: 4.4, ease: "power2.out" }, 0);
  tl.fromTo($(scene, "[data-f=title]"), { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: EASE.out }, 0.4);
  tl.fromTo(lines, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.45, ease: EASE.out }, 1.1);
  if (cta) tl.fromTo(cta, { y: 40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 1, ease: "back.out(1.6)" }, 3.2);
}
