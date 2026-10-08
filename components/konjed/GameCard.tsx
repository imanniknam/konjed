import type { CSSProperties } from "react";
import type { GameDto } from "@/lib/server/services/games";
import { Img } from "./Img";
import { PlayButton } from "./pages/PlayButton";

export type CabGame = GameDto & { index: string; prop: string };

/**
 * A game "cabinet": marquee, screen, control deck. The skill is a visual badge, copy stays short.
 * `data-active` is driven by the arcade scroll timeline (or always true in flow mode via CSS).
 */
export function GameCard({ game }: { game: CabGame }) {
  return (
    <article className="cab" data-cab data-active="false" style={{ "--accent": game.accent } as CSSProperties} aria-labelledby={`game-${game.slug}`}>
      <div className="cab__inner">
        <header className="cab__marquee">
          <span className="cab__index" aria-hidden="true">{game.index}</span>
          <h3 id={`game-${game.slug}`}>{game.title}</h3>
        </header>
        <div className="cab__screen">
          <Img src={game.cover} alt={`صحنه‌ای از بازی ${game.title}`} stage={1} width={560} height={510} />
          <span className="cab__skill"><i aria-hidden="true" />{game.skill}</span>
        </div>
        <div className="cab__deck">
          <p className="cab__text">{game.text}</p>
          <div className="cab__controls" aria-hidden="true"><b /><b /><b /></div>
          <PlayButton slug={game.slug} className="btn btn--arcade btn--sm" />
        </div>
        <Img className="cab__prop" src={game.prop} aria-hidden="true" stage={1} />
      </div>
      <div className="cab__base" aria-hidden="true" />
    </article>
  );
}
