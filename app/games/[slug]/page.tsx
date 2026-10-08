import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KonjedFooter } from "@/components/konjed/KonjedFooter";
import { KonjedNavigation } from "@/components/konjed/KonjedNavigation";
import { KonjedButton } from "@/components/konjed/KonjedButton";
import { PageShell } from "@/components/konjed/pages/PageShell";
import { PlayButton } from "@/components/konjed/pages/PlayButton";
import { getPageDoc } from "@/lib/server/cms";
import { getGame } from "@/lib/server/services/games";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageDoc(`games/${slug}`);
  if (page) return { title: `${page.seo} | کنجد` };
  const g = await getGame(slug).catch(() => null);
  return { title: g ? `${g.title} | کنجد آرکید` : "بازی پیدا نشد | کنجد" };
}

/** `/games/<slug>` is either one of the static game sub-pages (skills / popular / publish) or a game's own page. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = await getPageDoc(`games/${slug}`);
  if (page) return <PageShell page={page} />;
  const g = await getGame(slug).catch(() => null);
  if (!g) notFound();
  const rows = [["مهارت اصلی", g.skill], ["گروه مهارت", g.groupLabel], ["گروه سنی", g.ageLabel], ["مدت زمان بازی", g.durationLabel], ["سازنده", g.creator], ["رایگان / پولی", g.priceLabel]].filter(([, v]) => v) as [string, string][];
  return (
    <>
      <KonjedNavigation />
      <main id="main" className="gamepage" style={{ "--accent": g.accent } as CSSProperties}>
        <div className="gamepage__in">
          <div className="gamepage__cover"><img src={g.cover} alt={`صحنه‌ای از بازی ${g.title}`} /></div>
          <div className="gamepage__info">
            <p className="eyebrow">کنجد آرکید{g.genre ? ` · ${g.genre}` : ""}</p>
            <h1 className="h-display">{g.title}</h1>
            <p className="lead">{g.text}</p>
            {g.tags.length > 0 && <ul className="chips">{g.tags.map((t) => <li className="chip" key={t}>{t}</li>)}</ul>}
            <dl className="gamepage__meta">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            <div className="actions">
              <PlayButton slug={g.slug} className="btn btn--primary btn--lg" label={g.playUrl ? "شروع بازی" : "شروع بازی"} />
              <KonjedButton href="/games" variant="secondary" size="lg">همه بازی‌ها</KonjedButton>
            </div>
            {!g.playUrl && <p className="pg-note">اجرای آنلاین این بازی هنوز فعال نشده؛ به‌محض آماده شدن، همین دکمه شما را وارد بازی می‌کند. شروع بازی در پنلت ثبت می‌شود.</p>}
          </div>
        </div>
      </main>
      <KonjedFooter />
    </>
  );
}
