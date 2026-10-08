import { ASSETS, plateW } from "@/lib/konjed/assetMap";
import { Plate } from "../Img";
import type { PageData, PageTheme } from "@/lib/konjed/pages/types";
import { FloatingObject } from "../FloatingObject";
import { KonjedButton } from "../KonjedButton";

const R = ASSETS.rewards;
const THEME: Record<PageTheme, { bg: string; pos: string; props: { src: string; cls: string }[] }> = {
  arcade: { bg: ASSETS.arcade.hall, pos: "50% 50%", props: [{ src: R.controller, cls: "a" }, { src: R.coin, cls: "b" }, { src: R.crystal, cls: "c" }] },
  publish: { bg: ASSETS.arcade.hall, pos: "85% 50%", props: [{ src: R.controller, cls: "a" }, { src: R.gear, cls: "b" }, { src: R.bulb, cls: "c" }] },
  school: { bg: ASSETS.school.castle, pos: "40% 50%", props: [{ src: R.backpack, cls: "a" }, { src: R.book, cls: "b" }, { src: R.bulb, cls: "c" }] },
  showcase: { bg: ASSETS.showcase.gallery, pos: "50% 45%", props: [{ src: R.trophy, cls: "a" }, { src: R.badgeStar, cls: "b" }, { src: R.crown, cls: "c" }] },
  about: { bg: ASSETS.world.finalSunset, pos: "28% 50%", props: [{ src: R.scroll, cls: "a" }, { src: R.book, cls: "b" }, { src: R.potion, cls: "c" }] },
};

export function PageHero({ page }: { page: PageData }) {
  const t = THEME[page.theme];
  return (
    <header className={`phero phero--${page.theme}`}>
      <div className="phero__bg" aria-hidden="true">
        <Plate src={t.bg} fullW={plateW(t.bg)} eager style={{ objectPosition: t.pos }} />
        <div className="phero__tint" />
      </div>
      {t.props.map((p) => <FloatingObject key={p.cls} src={p.src} className={`phero__prop phero__prop--${p.cls}`} duration={6 + p.cls.charCodeAt(0) % 4} delay={p.cls.charCodeAt(0) % 3} />)}
      <div className="phero__inner">
        {page.hero.eyebrow && <p className="eyebrow">{page.hero.eyebrow}</p>}
        <h1 className="h-display">{page.hero.title}</h1>
        {page.hero.text.map((t, i) => <p key={i} className={i === 0 ? "lead" : "body-text"}>{t}</p>)}
        {page.hero.ctas.length > 0 && (
          <div className="actions">
            {page.hero.ctas.map((c) => <KonjedButton key={c.label} href={c.href} variant={c.variant ?? "primary"} size="lg">{c.label}</KonjedButton>)}
          </div>
        )}
      </div>
    </header>
  );
}
