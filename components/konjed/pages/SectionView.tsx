import type { CSSProperties } from "react";
import type { CardItem, Cta, Section } from "@/lib/konjed/pages/types";
import type { GameDto } from "@/lib/server/services/games";
import type { SessionUser } from "@/lib/server/auth/session";
import { listCourses } from "@/lib/server/services/courses";
import { listProjects } from "@/lib/server/services/projects";
import { listChallenges } from "@/lib/server/services/challenges";
import { achievementSummary, badgeProgress } from "@/lib/server/services/gamification";
import { mySubmissions } from "@/lib/server/services/inbox";
import { dateFa } from "@/lib/format";
import { ChallengeCard } from "./ChallengeCard";
import { CtaButtons } from "./CtaButtons";
import { EnrollButton } from "./EnrollButton";
import { ProjectFeed } from "./ProjectFeed";
import { ProjectForm } from "../forms/ProjectForm";
import { KonjedButton } from "../KonjedButton";
import { FormSection } from "./FormSection";
import { GameCatalog } from "./GameCatalog";
import { GameTile } from "./GameTile";

const Head = ({ eyebrow, title, text, id }: { eyebrow?: string; title: string; text?: string; id: string }) => (
  <div className="pg-head">
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h2 id={id} className="h-display">{title}</h2>
    {text && <p className="lead">{text}</p>}
  </div>
);

const BADGE_ART: Record<string, string> = { badgeStar: "badge-star", badgePurple: "badge-purple", medalBlue: "medal-blue", crown: "crown", medalPurple: "medal-purple", crystal: "crystal", scroll: "scroll", backpack: "backpack", trophy: "trophy" };

const Ctas = ({ items }: { items: Cta[] }) => (
  <div className="actions">{items.map((c) => <KonjedButton key={c.label} href={c.href} variant={c.variant ?? "primary"}>{c.label}</KonjedButton>)}</div>
);

function Card({ c }: { c: CardItem }) {
  return (
    <article className="pcard2">
      {c.art && <img className="pcard2__art" src={c.art} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
      {c.status && <span className="pcard2__status"><i aria-hidden="true" />{c.status}</span>}
      {c.tag && <span className="chip">{c.tag}</span>}
      <h3>{c.title}</h3>
      {c.text && <p>{c.text}</p>}
      {c.chips && <ul className="chips">{c.chips.map((x) => <li className="chip" key={x}>{x}</li>)}</ul>}
      {c.meta && <dl className="pcard2__meta">{c.meta.map((m) => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>)}</dl>}
      {c.cta && <KonjedButton href={c.cta.href} variant={c.cta.variant ?? "ghost"} size="sm" magnetic={false}>{c.cta.label}</KonjedButton>}
    </article>
  );
}

export type Ctx = { games: GameDto[]; user: SessionUser | null };

export async function SectionView({ s, index, ctx }: { s: Section; index: number; ctx: Ctx }) {
  const sid = `s${index}`;
  const tone = index % 2 ? "alt" : "base";
  switch (s.kind) {
    case "catalog":
      return <GameCatalog games={ctx.games} id={s.id} title={s.title} text={s.text} variant={s.variant} />;
    case "form":
      return <FormSection id={s.id ?? sid} title={s.title} text={s.text} fields={s.fields} submit={s.submit} endpoint={s.endpoint} />;
    case "prose":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap pg-wrap--narrow">
            <Head eyebrow={s.eyebrow} title={s.title} id={sid} />
            <div className="prose">{s.paragraphs?.map((p, i) => <p key={i} className="body-text">{p}</p>)}</div>
            {s.ctas && <Ctas items={s.ctas} />}
          </div>
        </section>
      );
    case "cards":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap">
            <Head eyebrow={s.eyebrow} title={s.title} text={s.text} id={sid} />
            {s.items.length > 0 && <div className="grid" style={{ "--cols": s.cols ?? 3 } as CSSProperties}>{s.items.map((c) => <Card key={c.title} c={c} />)}</div>}
            {s.note && <p className="pg-note">{s.note}</p>}
            {s.cta && <div className="pg-actions"><KonjedButton href={s.cta.href} variant={s.cta.variant ?? "primary"}>{s.cta.label}</KonjedButton></div>}
          </div>
        </section>
      );
    case "steps":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap">
            <Head title={s.title} text={s.text} id={sid} />
            <ol className="stepsx">{s.items.map((it, i) => (
              <li key={it.title}><span className="stepsx__n" aria-hidden="true">{(i + 1).toLocaleString("fa-IR")}</span><h3>{it.title}</h3><p>{it.text}</p></li>
            ))}</ol>
          </div>
        </section>
      );
    case "skills":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap">
            <Head title={s.title} text={s.text} id={sid} />
            <div className="skills">
              {s.groups.map((g) => (
                <div key={g.title} className="skills__group">
                  {s.groups.length > 1 && <h3>{g.title}</h3>}
                  {g.text && <p className="body-text">{g.text}</p>}
                  <ul className="chips">{g.items.map((x) => <li className="chip" key={x}>{x}</li>)}</ul>
                  {g.games && <div className="tiles tiles--mini"><p className="skills__label">بازی‌های مرتبط</p>{g.games.map((slug) => ctx.games.find((x) => x.slug === slug)).filter((x): x is GameDto => !!x).map((x) => <GameTile key={x.slug} game={x} />)}</div>}
                  {g.cta && <KonjedButton href={g.cta.href} variant="ghost" size="sm" magnetic={false}>{g.cta.label}</KonjedButton>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "chips":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap">
            <Head title={s.title} text={s.text} id={sid} />
            <ul className="chips-row">{s.items.map((x) => <li key={x}>{s.linkTo ? <a className="pill" href={`${s.linkTo.split("#")[0]}?skill=${encodeURIComponent(x)}#${s.linkTo.split("#")[1] ?? ""}`}>{x}</a> : <span className="pill">{x}</span>}</li>)}</ul>
          </div>
        </section>
      );
    case "bullets":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap pg-wrap--narrow">
            <Head title={s.title} text={s.text} id={sid} />
            {s.lead && <p className="body-text accent">{s.lead}</p>}
            <ul className="bullets">{s.items.map((x) => <li key={x}>{x}</li>)}</ul>
            {s.cta && <div className="pg-actions"><KonjedButton href={s.cta.href}>{s.cta.label}</KonjedButton></div>}
          </div>
        </section>
      );
    case "faq":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap pg-wrap--narrow">
            <Head title={s.title} id={sid} />
            <div className="faq">{s.items.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
          </div>
        </section>
      );
    case "stats":
      return (
        <section className="pg-section pg-section--base" id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap">
            <Head title={s.title} id={sid} />
            <dl className="stats">{s.items.map((x) => <div key={x.label}><dd>{x.value}</dd><dt>{x.label}</dt></div>)}</dl>
          </div>
        </section>
      );
    case "gamesRow":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap">
            <Head eyebrow={s.eyebrow} title={s.title} text={s.text} id={sid} />
            <div className="tiles">{s.ids.map((slug) => ctx.games.find((x) => x.slug === slug)).filter((x): x is GameDto => !!x).map((x) => <GameTile key={x.slug} game={x} />)}</div>
          </div>
        </section>
      );
    case "soon":
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap pg-wrap--narrow">
            <Head title={s.title} text={s.text} id={sid} />
            <p className="pg-note">{s.note ?? "به‌زودی"}</p>
            {s.cta && <div className="pg-actions"><KonjedButton href={s.cta.href} variant="ghost">{s.cta.label}</KonjedButton></div>}
          </div>
        </section>
      );
    case "emptyState":
      return null;
    case "cta":
      return (
        <section className="pg-cta" id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap pg-wrap--narrow">
            <h2 id={sid} className="h-display">{s.title}</h2>
            <p className="lead">{s.text}</p>
            <CtaButtons items={s.ctas} authCta={s.authCta} />
          </div>
        </section>
      );
    case "registeringCourses": {
      const courses = await listCourses({ status: "registering" });
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap">
            <Head title={s.title} text={s.text} id={sid} />
            {courses.length ? <div className="grid" style={{ "--cols": 2 } as CSSProperties}>{courses.map((c) => (
              <article key={c.id} className="pcard2">
                <span className="pcard2__status"><i aria-hidden="true" />{c.statusLabel}</span>
                <h3>{c.title}</h3>
                {c.description && <p>{c.description}</p>}
                <ul className="chips">{c.skills.map((x) => <li className="chip" key={x}>{x}</li>)}</ul>
                <dl className="pcard2__meta">
                  <div><dt>شروع دوره</dt><dd>{c.startsAt ? dateFa(c.startsAt) : "به‌زودی اعلام می‌شود"}</dd></div>
                  <div><dt>ظرفیت</dt><dd>{c.capacity ? `${c.seatsLeft?.toLocaleString("fa-IR")} جای خالی از ${c.capacity.toLocaleString("fa-IR")}` : "—"}</dd></div>
                  <div><dt>سن</dt><dd>{c.ageLabel}</dd></div>
                  <div><dt>مهارت</dt><dd>{c.skills.join(" • ")}</dd></div>
                </dl>
                <EnrollButton slug={c.slug} />
              </article>
            ))}</div> : <p className="pg-note">در حال حاضر دوره‌ای در حال ثبت‌نام نیست.</p>}
          </div>
        </section>
      );
    }
    case "projectsFeed": {
      const list = await listProjects({ sort: "popular", limit: 60 }, ctx.user?.id);
      return <ProjectFeed id={s.id} title={s.title} text={s.text} initial={list.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))} />;
    }
    case "projectForm":
      return <ProjectForm id={s.id} title={s.title} />;
    case "challengesLive": {
      const list = await listChallenges(ctx.user?.id);
      const active = list.filter((c) => c.status === "active" || c.available), next = list.filter((c) => !active.includes(c));
      return (
        <>
          <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
            <div className="pg-wrap"><Head title="چالش‌های در حال برگزاری" id={sid} />
              <div className="grid" style={{ "--cols": 2 } as CSSProperties}>{active.map((c) => <ChallengeCard key={c.id} c={c} />)}</div>
              {!active.length && <p className="pg-note">فعلاً چالش فعالی نیست.</p>}
            </div>
          </section>
          <section className="pg-section pg-section--base" id="upcoming" aria-label="مسابقات بعدی">
            <div className="pg-wrap"><Head title="مسابقات بعدی" id={`${sid}-n`} />
              <div className="grid" style={{ "--cols": 2 } as CSSProperties}>{next.map((c) => <ChallengeCard key={c.id} c={c} />)}</div>
            </div>
          </section>
        </>
      );
    }
    case "achievementsLive": {
      const u = ctx.user;
      if (!u || u.role !== "student") return (
        <section className="pg-section pg-section--base" aria-label="دستاوردهای من"><div className="pg-wrap pg-wrap--narrow">
          <div className="form"><h2 className="h-display">دستاوردهای خودت رو ببین</h2><p className="lead">برای دیدن نشان‌ها، امتیاز و مأموریت‌های کامل‌شده‌ات با حساب مهارت‌آموز وارد شو.</p><div className="actions"><KonjedButton href="/login?next=/showcase/achievements">ورود</KonjedButton><KonjedButton href="/signup" variant="secondary">ثبت‌نام</KonjedButton></div></div>
        </div></section>
      );
      const [sum, badges] = await Promise.all([achievementSummary(u.id), badgeProgress(u.id)]);
      const got = badges.filter((b) => b.earned), next = badges.filter((b) => !b.earned);
      return (
        <>
          <section className="pg-section pg-section--base" aria-labelledby="ach-sum"><div className="pg-wrap"><Head title="خلاصه دستاوردهای من" id="ach-sum" />
            <dl className="stats">{[[sum.points, "امتیاز کل"], [sum.badges, "نشان دریافت‌شده"], [sum.missions, "مأموریت کامل‌شده"], [sum.projects, "پروژه انجام‌شده"], [sum.skills, "مهارت فعال"]].map(([v, l]) => <div key={String(l)}><dd>{Number(v).toLocaleString("fa-IR")}</dd><dt>{l}</dt></div>)}</dl></div></section>
          <section className="pg-section pg-section--alt" aria-labelledby="ach-got"><div className="pg-wrap"><Head title="نشان‌هایی که به دست آوردم" id="ach-got" />
            {got.length ? <div className="grid" style={{ "--cols": 3 } as CSSProperties}>{got.map((b) => <article key={b.code} className="pcard2"><img className="pcard2__art" src={`/assets/konjed/rewards/${BADGE_ART[b.icon] ?? "badge-star"}.png`} alt="" aria-hidden="true" /><span className="pcard2__status"><i aria-hidden="true" />دریافت شد</span><h3>{b.title}</h3><p>{b.description}</p></article>)}</div> : <p className="pg-note">هنوز نشانی نگرفتی؛ یک مأموریت یا بازی رو شروع کن!</p>}</div></section>
          <section className="pg-section pg-section--base" aria-labelledby="ach-next"><div className="pg-wrap"><Head title="نشان بعدی می‌تونه مال تو باشه!" text="هنوز چند نشان دیگه مونده که می‌تونی به دستشون بیاری." id="ach-next" />
            <div className="grid" style={{ "--cols": 4 } as CSSProperties}>{next.map((b) => <article key={b.code} className="pcard2"><img className="pcard2__art" src={`/assets/konjed/rewards/${BADGE_ART[b.icon] ?? "badge-star"}.png`} alt="" aria-hidden="true" style={{ filter: "grayscale(.85) brightness(.7)" }} /><h3>{b.title}</h3><p>{b.description}</p><div className="meter" role="progressbar" aria-valuenow={b.progress} aria-valuemax={b.target}><i style={{ width: `${(b.progress / b.target) * 100}%` }} /></div><small className="muted">{b.progress.toLocaleString("fa-IR")} از {b.target.toLocaleString("fa-IR")}</small></article>)}</div>
            <div className="pg-actions"><KonjedButton href="/panel/student/missions">دیدن مأموریت‌ها</KonjedButton></div></div></section>
        </>
      );
    }
    case "mySubmissions": {
      if (!ctx.user) return null;
      const list = await mySubmissions(ctx.user.id);
      return (
        <section className={`pg-section pg-section--${tone}`} id={s.id} aria-labelledby={sid}>
          <div className="pg-wrap pg-wrap--narrow"><Head title={s.title} text={s.text} id={sid} />
            {list.length ? <ul className="subs">{list.map((x) => <li key={x.id}><b>{x.name}</b><span className={`subs__st subs__st--${x.status}`}>{x.statusLabel}</span>{x.adminNote && <small>{x.adminNote}</small>}</li>)}</ul> : <p className="pg-note">هنوز بازی‌ای ارسال نکرده‌ای.</p>}
          </div>
        </section>
      );
    }
  }
}
