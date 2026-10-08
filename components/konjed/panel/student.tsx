import Link from "next/link";
import { notFound } from "next/navigation";
import { GameTile } from "../pages/GameTile";
import { Bar, Block, Empty, LinkBtn, Stats, fa, faDate } from "./ui";
import { MissionSubmitForm } from "./clients";
import type { SessionUser } from "@/lib/server/auth/session";
import { studentDashboard } from "@/lib/server/services/dashboard";
import { getMission, missionMap } from "@/lib/server/services/missions";
import { listGames, myGames } from "@/lib/server/services/games";
import { toolbox } from "@/lib/server/services/dashboard";
import { achievementSummary, badgeProgress, rankings } from "@/lib/server/services/gamification";
import { myProjects } from "@/lib/server/services/projects";
import { myCourses } from "@/lib/server/services/courses";

const GROUP = { soft: "مهارت‌های نرم", finance: "سواد مالی", entrepreneurship: "کارآفرینی" } as const;
const KIND = { tool: "ابزار", exercise: "تمرین کوتاه", template: "الگو و قالب", checklist: "چک‌لیست", activity: "فعالیت پیشنهادی" } as const;

export async function StudentDashboard({ user }: { user: SessionUser }) {
  const d = await studentDashboard(user.id);
  return (
    <div className="panel__grid">
      <Block title="سلام، قهرمان!" wide>
        <div className="hero-card">
          <div className="avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</div>
          <div><h3>{d.name}</h3><p>سطح {fa(d.level)} · رتبه {d.rank ? fa(d.rank) : "—"} در کل کنجد</p><Bar value={d.points % 300} max={300} label="پیشرفت تا سطح بعد" /><small className="muted">{fa(300 - (d.points % 300))} امتیاز تا سطح بعدی</small></div>
        </div>
        <Stats items={[{ label: "امتیاز", value: fa(d.points) }, { label: "سکه", value: fa(d.coins) }, { label: "نشان", value: fa(d.badges) }, { label: "رتبه فعلی", value: d.rank ? fa(d.rank) : "—" }]} />
      </Block>
      {d.onboarding.some((o) => !o.done) && (
        <Block title={`قدم‌های شروع (${fa(d.onboarding.filter((o) => o.done).length)} از ${fa(d.onboarding.length)})`} wide>
          <Bar value={d.onboarding.filter((o) => o.done).length} max={d.onboarding.length} label="پیشرفت قدم‌های شروع" />
          <ol className="steps5">{d.onboarding.map((o) => <li key={o.key} data-done={o.done}><span aria-hidden="true">{o.done ? "✓" : ""}</span>{o.done ? <s>{o.label}</s> : <Link href={o.href}>{o.label}</Link>}</li>)}</ol>
        </Block>
      )}
      <Block title="مأموریت بعدی من">
        {d.nextMission ? <><h3>{d.nextMission.title}</h3><p className="muted">{d.nextMission.path} · مهارت: {d.nextMission.skill}</p><p>جایزه: {fa(d.nextMission.points)} امتیاز و {fa(d.nextMission.coins)} سکه</p><LinkBtn href={`/panel/student/missions/${d.nextMission.id}`}>شروع مأموریت</LinkBtn></> : <Empty>مأموریت فعالی نداری. در یک دوره ثبت‌نام کن تا نقشه‌ات باز بشه.<br /><LinkBtn href="/courses#registering" variant="ghost">دیدن دوره‌ها</LinkBtn></Empty>}
      </Block>
      <Block title="ادامه مسیر یادگیری">
        {d.resume ? <><h3>{d.resume.title}</h3><Bar value={d.resume.done} max={d.resume.total} label="پیشرفت مسیر" /><p className="muted">{fa(d.resume.done)} از {fa(d.resume.total)} مأموریت</p><LinkBtn href="/panel/student/missions" variant="ghost">نقشه مأموریت‌ها</LinkBtn></> : <Empty>هنوز مسیری شروع نکردی.</Empty>}
      </Block>
      <Block title="دستاوردهای اخیر">
        {d.lastBadge && <p className="status"><i aria-hidden="true" />آخرین نشان: {d.lastBadge.title}</p>}
        {d.recentRewards.length ? <ul className="plist">{d.recentRewards.map((r) => <li key={r.id}><div><b>{r.reason}</b></div><span className={r.amount >= 0 ? "pos" : "neg"}>{r.amount >= 0 ? "+" : ""}{fa(r.amount)} {r.kind === "points" ? "امتیاز" : "سکه"}</span></li>)}</ul> : <Empty>اولین دستاوردت منتظرته!</Empty>}
      </Block>
      <Block title="پیشنهادهای کنجد" wide>
        {d.suggestions.length ? <div className="tiles">{d.suggestions.map((g) => <GameTile key={g.slug} game={g} />)}</div> : <Empty>همه بازی‌ها رو امتحان کردی! 🎉</Empty>}
      </Block>
      <Block title="کد اتصال والدین"><p>این کد رو به والدینت بده تا پیشرفتت رو ببینن:</p><p className="linkcode" dir="ltr">{d.linkCode}</p></Block>
    </div>
  );
}

export async function StudentMissions({ user }: { user: SessionUser }) {
  const paths = await missionMap(user.id);
  if (!paths.length) return <div className="panel__grid panel__grid--one"><Block title="نقشه مأموریت‌ها" wide><Empty>هنوز مسیری برات باز نشده. در یک دوره ثبت‌نام کن.<br /><LinkBtn href="/courses#registering">مشاهده دوره‌ها</LinkBtn></Empty></Block></div>;
  return (
    <div className="panel__grid panel__grid--one">
      {paths.map((p) => (
        <Block key={p.pathId} title={`مسیر فعال: ${p.title}`} wide action={<span className="muted">{fa(p.done)} از {fa(p.total)}</span>}>
          <Bar value={p.done} max={p.total} label="پیشرفت مسیر" />
          <ol className="mapx">
            {p.stages.map((s) => (
              <li key={s.stage}>
                <h3>مرحله {fa(s.stage)}</h3>
                <ul>{s.missions.map((m) => (
                  <li key={m.id} data-state={m.state}>
                    {m.state === "locked" ? <div className="node" aria-disabled="true"><span aria-hidden="true">🔒</span><b>{m.title}</b><small>قفل — اول مأموریت‌های قبلی</small></div>
                      : <Link className="node" href={`/panel/student/missions/${m.id}`}><span aria-hidden="true">{m.state === "done" ? "✓" : "▶"}</span><b>{m.title}</b><small>{m.skill} · {fa(m.points)} امتیاز · {fa(m.coins)} سکه{m.score != null && ` · نمره ${fa(m.score)}`}</small></Link>}
                  </li>))}</ul>
              </li>
            ))}
          </ol>
        </Block>
      ))}
    </div>
  );
}

export async function StudentMissionDetail({ user, id }: { user: SessionUser; id: string }) {
  const m = await getMission(user.id, id).catch(() => null);
  if (!m) notFound();
  return (
    <div className="panel__grid">
      <Block title={m.title} wide action={<LinkBtn href="/panel/student/missions" variant="ghost">بازگشت به نقشه</LinkBtn>}>
        <p className="muted">{m.course ?? "مسیر عمومی کنجد"} · مهارت هدف: {m.skill}{m.minutes ? ` · زمان پیشنهادی: ${fa(m.minutes)} دقیقه` : ""}</p>
        <p>{m.description}</p>
        <div className="note"><b>دستور انجام</b><p>{m.instruction}</p></div>
        <p>جایزه: تا {fa(m.points)} امتیاز و {fa(m.coins)} سکه</p>
      </Block>
      {m.state === "current" && <Block title="ارسال پاسخ" wide><MissionSubmitForm missionId={m.id} reward={{ points: m.points, coins: m.coins }} /></Block>}
      {m.state === "locked" && <Block title="این مأموریت هنوز قفله" wide><Empty>مأموریت‌های قبلی مسیر رو تموم کن تا این یکی باز بشه.</Empty></Block>}
      {m.submission && (
        <Block title="نتیجه ارزیابی" wide>
          <p className="evalcard__score">{fa(m.submission.coachScore ?? m.submission.aiScore ?? 0)}<small>/۱۰۰</small></p>
          <p><b>ارزیابی هوش مصنوعی:</b> {m.submission.aiFeedback}</p>
          {m.submission.coachReview !== "pending" && <p><b>بازبینی مربی:</b> {m.submission.coachFeedback ?? (m.submission.coachReview === "approved" ? "تأیید شد." : "امتیاز اصلاح شد.")}</p>}
          <p className="status"><i aria-hidden="true" />{fa(m.submission.pointsAwarded)} امتیاز و {fa(m.submission.coinsAwarded)} سکه</p>
          <details><summary>پاسخ من</summary><p>{m.submission.text}</p></details>
        </Block>
      )}
    </div>
  );
}

export async function StudentArcade({ user }: { user: SessionUser }) {
  const [all, mine, sug] = await Promise.all([listGames({ sort: "recommended", limit: 60 }), myGames(user.id), studentDashboard(user.id).then((d) => d.suggestions)]);
  const popular = [...all].sort((a, b) => b.plays - a.plays).slice(0, 3), fresh = [...all].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3);
  const row = (list: typeof all, empty: string) => (list.length ? <div className="tiles">{list.map((g) => <GameTile key={g.slug} game={g} />)}</div> : <Empty>{empty}</Empty>);
  return (
    <div className="panel__grid panel__grid--one">
      <Block title="بازی‌های پیشنهادی" wide>{row(sug, "همه بازی‌ها رو امتحان کردی!")}</Block>
      <Block title="بازی‌های محبوب" wide>{row(popular, "")}</Block>
      <Block title="بازی‌های جدید" wide>{row(fresh, "")}</Block>
      {(["soft", "finance", "entrepreneurship"] as const).map((g) => <Block key={g} title={`بازی بر اساس مهارت: ${GROUP[g]}`} wide>{row(all.filter((x) => x.skillGroup === g), "بازی‌ای در این دسته نیست.")}</Block>)}
      <Block title="بازی‌های من" wide>{row(mine.filter((x) => !x.completed), "هنوز بازی‌ای شروع نکردی.")}</Block>
      <Block title="بازی‌های تکمیل‌شده" wide>{row(mine.filter((x) => x.completed), "هنوز بازی‌ای رو تموم نکردی.")}</Block>
    </div>
  );
}

export async function StudentToolbox() {
  const items = await toolbox();
  return (
    <div className="panel__grid">
      {(["soft", "finance", "entrepreneurship"] as const).map((g) => (
        <Block key={g} title={GROUP[g]}>
          {items.filter((i) => i.skillGroup === g).map((i) => <details key={i.id} className="tool"><summary>{i.title} <em>{KIND[i.kind as keyof typeof KIND] ?? i.kind}</em></summary><p>{i.body}</p></details>)}
        </Block>
      ))}
    </div>
  );
}

export async function StudentProjects({ user }: { user: SessionUser }) {
  const [projects, sum, badges] = await Promise.all([myProjects(user.id), achievementSummary(user.id), badgeProgress(user.id)]);
  return (
    <div className="panel__grid">
      <Block title="دستاوردهای من" wide><Stats items={[{ label: "امتیاز", value: fa(sum.points) }, { label: "سکه", value: fa(sum.coins) }, { label: "نشان", value: fa(sum.badges) }, { label: "مأموریت تکمیل‌شده", value: fa(sum.missions) }, { label: "پروژه", value: fa(sum.projects) }]} /></Block>
      <Block title="پروژه‌های من" wide action={<LinkBtn href="/showcase/gallery#submit">انتشار پروژه جدید</LinkBtn>}>
        {projects.length ? <ul className="plist">{projects.map((p) => <li key={p.id}><div><b>{p.title}</b><p>{p.kindLabel}{p.skill ? ` · ${p.skill}` : ""} · {fa(p.likes)} پسند · {fa(p.comments)} نظر</p></div><small>{p.status === "published" ? "منتشرشده" : "پیش‌نویس"}</small></li>)}</ul> : <Empty>هنوز پروژه‌ای نساخته‌ای. یک ایده بساز و نشونش بده!</Empty>}
      </Block>
      <Block title="نشان‌ها" wide>
        <ul className="badgegrid">{badges.map((b) => <li key={b.code} data-earned={b.earned}><b>{b.title}</b><small>{b.description}</small>{!b.earned && <Bar value={b.progress} max={b.target} />}</li>)}</ul>
      </Block>
      <Block title="فید پروژه‌ها" wide><p>پروژه‌های بقیه رو ببین، لایک کن و بازخورد بده.</p><LinkBtn href="/showcase/gallery" variant="ghost">رفتن به ویترین مهارت‌آموزها</LinkBtn></Block>
    </div>
  );
}

export async function StudentRanking({ user }: { user: SessionUser }) {
  const [r, badges, courses] = await Promise.all([rankings(user.id), badgeProgress(user.id), myCourses(user.id)]);
  if (!r) return null;
  return (
    <div className="panel__grid">
      <Block title="رتبه من" wide><Stats items={[{ label: "امتیاز من", value: fa(r.points) }, { label: "رتبه در کنجد", value: fa(r.global) }, { label: "رتبه در کلاس", value: r.inClass ? fa(r.inClass) : "—" }, { label: "رتبه در گروه سنی", value: fa(r.inAge) }]} />{!courses.length && <small className="muted">برای رتبه در کلاس، در یک دوره ثبت‌نام کن.</small>}</Block>
      <Block title="نفرات برتر">
        <ol className="rank">{r.top.map((t, i) => <li key={t.id} data-me={t.id === user.id}><b>{fa(i + 1)}</b><span>{t.name}</span><small>سطح {fa(t.level)}</small><em>{fa(t.points)}</em></li>)}</ol>
      </Block>
      <Block title="شرایط دریافت نشان‌ها"><ul className="plist">{badges.map((b) => <li key={b.code}><div><b>{b.title}</b><p>{b.description}</p></div><small>{b.earned ? "✓ دریافت شد" : `${fa(b.progress)}/${fa(b.target)}`}</small></li>)}</ul></Block>
    </div>
  );
}
void faDate;
