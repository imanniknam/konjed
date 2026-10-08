import type { HomeContent } from "@/lib/konjed/content";
import { Gate, Backdrop } from "./Backdrop";
import { GameCard, type CabGame } from "./GameCard";
import { KonjedButton } from "./KonjedButton";

export function KonjedArcade({ c: ARCADE, games }: { c: HomeContent["arcade"]; games: CabGame[] }) {
  return (
    <section id="arcade" data-scene="arcade" className="scene scene--arcade" aria-labelledby="arcade-title">
      <div className="stage">
        <Backdrop scene="arcade" />
        <div className="arcade__glow" aria-hidden="true" />

        <header className="head head--arcade" data-a="head">
          <p className="eyebrow" data-reveal><span aria-hidden="true" className="eyebrow__no">۰۲</span>{ARCADE.eyebrow}</p>
          <h2 id="arcade-title" className="h-display" data-reveal>{ARCADE.title}</h2>
          <p className="lead" data-reveal>{ARCADE.lead}</p>
          <p className="body-text" data-reveal>{ARCADE.body}</p>
          <div data-reveal><KonjedButton href={ARCADE.cta.href} variant="secondary">{ARCADE.cta.label}</KonjedButton></div>
        </header>

        <div className="cabs" data-a="cabs">
          {games.map((g) => <GameCard key={g.slug} game={g} />)}
        </div>

        <ol className="dots" aria-label="انتخاب بازی">
          {games.map((g) => (
            <li key={g.slug}><button type="button" data-dot aria-current="false" aria-label={`نمایش بازی ${g.title}`}><span>{g.index}</span></button></li>
          ))}
        </ol>

        <Gate next="school" />
      </div>
    </section>
  );
}
