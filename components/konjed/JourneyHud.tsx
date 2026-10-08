"use client";

import { useEffect, useRef, useState } from "react";
import { goToScene, SCENE_ORDER } from "@/lib/animations/registry";
import { toFa } from "@/lib/format";

const LABELS: Record<string, string> = { hero: "شروع ماجراجویی", arcade: "کنجد آرکید", school: "مدرسه مهارت", showcase: "ویترین مهارت‌آموزها", journey: "کنجد چطور کار می‌کند؟", final: "اولین مأموریتت" };
const REWARD: Record<string, string> = { arcade: "آرکید رو کشف کردی", school: "پا به مدرسه مهارت گذاشتی", showcase: "ویترین پروژه‌ها رو دیدی", journey: "راز ماجراجویی رو فهمیدی", final: "به خط شروع رسیدی؛ نوبت توئه!" };

/**
 * Page-level wayfinding + a tiny reward loop: a scene rail (jump anywhere) and a "story score" that grows
 * the first time each scene is reached. Pure UI sugar; reads the central scroll system's `konjed:scene` events.
 */
export function JourneyHud() {
  const [scene, setScene] = useState<string>("hero");
  const [score, setScore] = useState(0);
  const [toast, setToast] = useState<{ k: number; text: string } | null>(null);
  const seen = useRef(new Set<string>(["hero"]));
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const on = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      setScene(id);
      if (!seen.current.has(id) && REWARD[id] && document.documentElement.dataset.ready === "true") {
        seen.current.add(id);
        setScore((s) => s + 20);
        if (!reduce.current) { setToast({ k: Date.now(), text: REWARD[id] }); window.setTimeout(() => setToast((t) => (t && Date.now() - t.k >= 2400 ? null : t)), 2500); }
      }
    };
    window.addEventListener("konjed:scene", on);
    return () => window.removeEventListener("konjed:scene", on);
  }, []);

  const idx = SCENE_ORDER.indexOf(scene as (typeof SCENE_ORDER)[number]);
  return (
    <>
      <nav className="rail" aria-label="مسیر صفحه اصلی">
        <ol>
          {SCENE_ORDER.map((id, i) => (
            <li key={id}>
              <button type="button" onClick={() => goToScene(id)} aria-label={`رفتن به: ${LABELS[id]}`} aria-current={id === scene ? "step" : undefined} data-done={i < idx}>
                <span className="rail__dot" />
                <span className="rail__label">{LABELS[id]}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="hud" aria-hidden={toast ? undefined : true} data-show={score > 0}>
        <span className="hud__score"><img src="/assets/konjed/rewards/coin.png" alt="" loading="lazy" />{toFa(score)}</span>
        {toast && <span key={toast.k} className="hud__toast" role="status">+{toFa(20)} · {toast.text}</span>}
      </div>
      <div className="stickycta" data-show={scene !== "hero" && scene !== "final" && scene !== "showcase"}>
        <a className="btn btn--primary btn--md" href="/signup"><span className="btn__label">شروع ماجراجویی</span></a>
      </div>
    </>
  );
}
