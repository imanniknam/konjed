import { ASSETS } from "@/lib/konjed/assetMap";
import { LQIP } from "@/lib/konjed/lqip";
import { Img, Plate } from "./Img";
import type { HomeContent } from "@/lib/konjed/content";
import { KonjedButton } from "./KonjedButton";

export function FinalAdventure({ c: FINAL }: { c: HomeContent["final"] }) {
  return (
    <section id="final" data-scene="final" className="scene scene--final" aria-labelledby="final-title">
      <div className="stage">
        <div className="cam cam--world" data-cam="1" data-x="50" data-y="50" style={LQIP[ASSETS.world.finalSunset] ? { backgroundImage: `url(${LQIP[ASSETS.world.finalSunset]})` } : undefined}>
          <Plate className="final__img" src={ASSETS.world.finalSunset} fullW={2400} alt="نوجوان روی لبه صخره نشسته و غروب را بر فراز جزیره‌های شناور تماشا می‌کند" stage={5} />
        </div>
        <div className="final__shade" aria-hidden="true" />
        <div className="cam final__cloud" data-cam="2.4" data-x="80" data-y="96" style={{ left: "80%", top: "96%", width: "70vw" }} aria-hidden="true">
          <Img src={ASSETS.world.cloudSunset} stage={5} />
        </div>
        <div className="cam final__cloud" data-cam="3" data-x="10" data-y="8" style={{ left: "10%", top: "8%", width: "50vw" }} aria-hidden="true">
          <Img src={ASSETS.world.cloudSunset} stage={5} />
        </div>

        <div className="final__content">
          <h2 id="final-title" className="h-display h-display--xl" data-f="title">{FINAL.title}</h2>
          <p className="final__lines">
            {FINAL.lines.map((l) => <span key={l} data-f="line">{l}</span>)}
          </p>
          <div data-f="cta" className="final__cta">
            <KonjedButton href={FINAL.cta.href} size="lg">{FINAL.cta.label}</KonjedButton>
            <p className="micro">{FINAL.micro}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
