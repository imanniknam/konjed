import { ASSETS } from "@/lib/konjed/assetMap";
import { LQIP } from "@/lib/konjed/lqip";
import { Plate } from "./Img";
import type { HomeContent } from "@/lib/konjed/content";
import { KonjedButton } from "./KonjedButton";

const W = ASSETS.world;

/** Camera layer helper: data-cam = depth factor, data-x/y = element centre on the stage (%). */
function Cam({ src, k, x, y, w, className = "", pp, flip, op = 1 }: { src: string; k: number; x: number; y: number; w: string; className?: string; pp?: number; flip?: boolean; op?: number }) {
  return (
    <div className={`cam ${className}`} data-cam={k} data-x={x} data-y={y} data-pp={pp} style={{ left: `${x}%`, top: `${y}%`, width: w, opacity: op }}>
      {/cloudbank/.test(src) ? (
        <picture>
          <source type="image/avif" srcSet={`${src.replace(".webp", "-640.avif")} 640w, ${src.replace(".webp", "-1200.avif")} 1200w`} sizes={`(max-width: 899px) 34vw, ${w}`} />
          <img src={src} srcSet={`${src.replace(".webp", "-640.webp")} 640w, ${src} 1200w`} sizes={`(max-width: 899px) 34vw, ${w}`} alt="" aria-hidden="true" decoding="async" style={flip ? { transform: "scaleX(-1)" } : undefined} />
        </picture>
      ) : (
        <img src={src} alt="" aria-hidden="true" decoding="async" style={flip ? { transform: "scaleX(-1)" } : undefined} />
      )}
    </div>
  );
}

export function KonjedHero({ c: HERO }: { c: HomeContent["hero"] }) {
  return (
    <section id="hero" data-scene="hero" className="scene scene--hero" aria-labelledby="hero-title">
      <div className="stage">
        {/* BACKGROUND — the world plate (camera depth 1) */}
        <div className="cam cam--world" data-h="world" data-cam="1" data-x="50" data-y="50" data-pp="6" style={LQIP[W.hero] ? { backgroundImage: `url(${LQIP[W.hero]})` } : undefined}>
          <Plate className="world__img" src={W.hero} fullW={3000} eager alt="نوجوانی با کوله‌پشتی روی صخره‌ای ایستاده و به جزیره‌های شناور و قلعه‌ای در آسمان نگاه می‌کند" />
        </div>

        {/* MIDGROUND — drifting islands and mist */}
        <Cam src={W.islandForest} k={1.9} x={13} y={30} w="min(11vw,190px)" className="float-slow" pp={16} />
        <Cam src={W.islandWaterfall} k={2.3} x={93} y={20} w="min(8vw,150px)" className="float-slow float-slow--b" pp={22} />
        <Cam src={W.islandMini} k={2.6} x={97} y={86} w="min(9vw,160px)" className="float-slow" pp={26} />

        <div className="shade" data-h="shade" />

        {/* PORTAL — the arcade, revealed inside the cloud break */}
        <div className="portal" data-h="portal">
          <div className="backdrop backdrop--arcade" aria-hidden="true">
            <Plate src={ASSETS.arcade.hall} fullW={3000} stage={1} />
            <div className="backdrop__tint" />
          </div>
        </div>

        {/* FOREGROUND — framing clouds, then the cloud wall the camera punches through */}
        <Cam src={W.bankA} k={1.4} x={22} y={104} w="62vw" className="fore" pp={34} />
        <Cam src={W.bankC} k={1.6} x={84} y={106} w="62vw" className="fore" pp={40} />
        <Cam src={W.bankA} k={2.6} x={50} y={50} w="48vw" className="fore rush" op={0} />
        <Cam src={W.bankB} k={2.3} x={34} y={52} w="46vw" className="fore rush" op={0} />
        <Cam src={W.bankC} k={2.9} x={68} y={46} w="46vw" className="fore rush" op={0} />
        <Cam src={W.bankA} k={2.1} x={50} y={64} w="54vw" className="fore rush" op={0} />
        <Cam src={W.bankB} k={3.1} x={52} y={44} w="40vw" className="fore rush" op={0} />

        {/* INTERACTIVE — copy and calls to action */}
        <div className="hero__content" data-h="content">
          <h1 id="hero-title" className="hero__title">
            <span className="rise" style={{ "--d": "0.2s" } as React.CSSProperties}>{HERO.title[0]}</span>
            <span className="hero__title-accent rise" style={{ "--d": "0.34s" } as React.CSSProperties}>{HERO.title[1]}</span>
          </h1>
          <p className="hero__lead rise" style={{ "--d": "0.5s" } as React.CSSProperties}>{HERO.lead}</p>
          <div className="hero__actions rise" style={{ "--d": "0.66s" } as React.CSSProperties}>
            <KonjedButton href={HERO.primary.href} size="lg">{HERO.primary.label}</KonjedButton>
            <KonjedButton href={HERO.secondary.href} variant="secondary" size="lg">{HERO.secondary.label}</KonjedButton>
          </div>
          <ul className="hero__micro rise" style={{ "--d": "0.8s" } as React.CSSProperties} aria-label="ویژگی‌های کنجد">
            {HERO.micro.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>

        <div className="scroll-hint" data-h="hint" aria-hidden="true">
          <span>{HERO.scrollHint}</span>
          <i />
        </div>
      </div>
    </section>
  );
}
