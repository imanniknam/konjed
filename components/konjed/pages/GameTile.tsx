import type { CSSProperties } from "react";
import Link from "next/link";
import type { GameDto } from "@/lib/server/services/games";
import { PlayButton } from "./PlayButton";

/** Catalogue card: cover, name, target skill, one-line text, age / duration, tags and the «شروع بازی» CTA. */
export function GameTile({ game }: { game: GameDto }) {
  const meta = [game.ageLabel && `رده سنی: ${game.ageLabel}`, game.durationLabel && `مدت بازی: ${game.durationLabel}`, game.priceLabel].filter(Boolean) as string[];
  return (
    <article className="tile" style={{ "--accent": game.accent } as CSSProperties} aria-labelledby={`tile-${game.slug}`}>
      <Link href={`/games/${game.slug}`} className="tile__cover" tabIndex={-1} aria-hidden="true">
        <img src={game.cover} alt="" loading="lazy" decoding="async" />
        <span className="cab__skill"><i aria-hidden="true" />{game.skill}</span>
        {game.tags.length > 0 && <ul className="tile__tags">{game.tags.slice(0, 2).map((t) => <li key={t}>{t}</li>)}</ul>}
      </Link>
      <div className="tile__body">
        {game.genre && <p className="tile__genre">ژانر: {game.genre}</p>}
        <h3 id={`tile-${game.slug}`}><Link href={`/games/${game.slug}`}>{game.title}</Link></h3>
        <p className="tile__text">{game.text}</p>
        {meta.length > 0 && <ul className="tile__meta">{meta.map((m) => <li key={m}>{m}</li>)}</ul>}
        <PlayButton slug={game.slug} />
      </div>
    </article>
  );
}
