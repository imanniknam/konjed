import Link from "next/link";
import { ApiForm } from "../forms/ApiForm";
import { Bar, Block, Empty, LinkBtn, Skills, Spark, Stats, fa, faDate } from "./ui";
import type { SessionUser } from "@/lib/server/auth/session";
import { childAchievements, childDashboard, childReport, childSkills, children } from "@/lib/server/services/parent";

/** Picks the child from ?child=, defaulting to the first linked one. */
async function pick(user: SessionUser, childId?: string) {
  const kids = await children(user.id);
  const cur = kids.find((k) => k.id === childId) ?? kids[0] ?? null;
  return { kids, cur };
}

function Picker({ kids, cur, base }: { kids: { id: string; name: string }[]; cur: string; base: string }) {
  if (kids.length < 2) return null;
  return <nav className="chips-row" aria-label="انتخاب فرزند">{kids.map((k) => <Link key={k.id} className="pill" aria-pressed={k.id === cur} href={`${base}?child=${k.id}`}>{k.name}</Link>)}</nav>;
}

function LinkChild() {
  return (
    <Block title="اتصال فرزند" wide>
      <p>از فرزندت بخواه کد اتصال رو از «پروفایل و تنظیمات» پنل خودش بخونه و اینجا وارد کن.</p>
      <ApiForm endpoint="/api/parent/link" fields={[{ name: "code", label: "کد اتصال فرزند", required: true }]} submit="اتصال" success="فرزند به حساب شما وصل شد." refresh />
    </Block>
  );
}

export async function ParentDashboard({ user, child }: { user: SessionUser; child?: string }) {
  const { kids, cur } = await pick(user, child);
  if (!cur) return <div className="panel__grid panel__grid--one"><LinkChild /></div>;
  const d = await childDashboard(user.id, cur.id);
  return (
    <div className="panel__grid">
      <Block title={`داشبورد ${d.name}`} wide><Picker kids={kids} cur={cur.id} base="/panel/parent/dashboard" />
        <Stats items={[{ label: "میزان پیشرفت (سطح)", value: fa(d.summary.level) }, { label: "مأموریت‌های انجام‌شده", value: fa(d.summary.missions) }, { label: "امتیاز", value: fa(d.summary.points) }, { label: "نشان‌ها", value: fa(d.summary.badges) }]} />
      </Block>
      <Block title="دوره فعال">{d.activeCourses.length ? <ul className="plist">{d.activeCourses.map((c) => <li key={c.id}><b>{c.title}</b><small>{c.statusLabel}</small></li>)}</ul> : <Empty>فرزندت هنوز در دوره‌ای ثبت‌نام نکرده.</Empty>}</Block>
      <Block title="مهارت‌های فعال">{d.activeSkills.length ? <ul className="chips">{d.activeSkills.map((s) => <li className="chip" key={s}>{s}</li>)}</ul> : <Empty>هنوز مهارتی ارزیابی نشده.</Empty>}<LinkBtn href={`/panel/parent/skills?child=${cur.id}`} variant="ghost">پیشرفت مهارتی</LinkBtn></Block>
      <Block title="پروژه‌های اخیر" wide>{d.recentProjects.length ? <ul className="plist">{d.recentProjects.map((p) => <li key={p.id}><div><b>{p.title}</b><p>{p.kindLabel}{p.skill ? ` · ${p.skill}` : ""}</p></div><small>{fa(p.likes)} پسند</small></li>)}</ul> : <Empty>پروژه‌ای ثبت نشده.</Empty>}</Block>
      <LinkChild />
    </div>
  );
}

export async function ParentSkills({ user, child }: { user: SessionUser; child?: string }) {
  const { kids, cur } = await pick(user, child);
  if (!cur) return <div className="panel__grid panel__grid--one"><LinkChild /></div>;
  const s = await childSkills(cur.id);
  return (
    <div className="panel__grid">
      <Block title={`رشد مهارت‌های ${cur.name}`} wide><Picker kids={kids} cur={cur.id} base="/panel/parent/skills" />{s.skills.length ? <Skills items={s.skills} /> : <Empty>هنوز مأموریتی ارزیابی نشده؛ بعد از اولین ارسال، نمودار اینجا ظاهر می‌شه.</Empty>}</Block>
      <Block title="نقاط قوت">{s.strengths.length ? <Skills items={s.strengths} /> : <Empty>—</Empty>}</Block>
      <Block title="مهارت‌های نیازمند تمرین بیشتر">{s.needsPractice.length ? <Skills items={s.needsPractice} /> : <Empty>مورد خاصی نیست 👏</Empty>}</Block>
      <Block title="روند پیشرفت در طول زمان" wide><Spark points={s.trend.map((t) => t.score)} /><p className="muted">{s.trend.map((t) => t.month).join(" ← ")}</p></Block>
    </div>
  );
}

export async function ParentProjects({ user, child }: { user: SessionUser; child?: string }) {
  const { kids, cur } = await pick(user, child);
  if (!cur) return <div className="panel__grid panel__grid--one"><LinkChild /></div>;
  const a = await childAchievements(user.id, cur.id);
  return (
    <div className="panel__grid">
      <Block title={`پروژه‌های ${cur.name}`} wide><Picker kids={kids} cur={cur.id} base="/panel/parent/projects" />{a.projects.length ? <ul className="plist">{a.projects.map((p) => <li key={p.id}><div><b>{p.title}</b><p>{p.kindLabel}{p.skill ? ` · ${p.skill}` : ""} · {p.status === "published" ? "منتشرشده" : "پیش‌نویس"}</p></div><small>{faDate(p.createdAt)}</small></li>)}</ul> : <Empty>پروژه‌ای ثبت نشده.</Empty>}</Block>
      <Block title="نشان‌ها">{a.badges.length ? <ul className="plist">{a.badges.map((b) => <li key={b.code}><div><b>{b.title}</b><p>{b.description}</p></div></li>)}</ul> : <Empty>هنوز نشانی نگرفته.</Empty>}</Block>
      <Block title="چالش‌های انجام‌شده">{a.challenges.length ? <ul className="plist">{a.challenges.map((c) => <li key={c.title}><b>{c.title}</b><small>{faDate(c.at)}</small></li>)}</ul> : <Empty>—</Empty>}</Block>
      <Block title="پورتفولیو" wide><Stats items={[{ label: "امتیازها", value: fa(a.summary.points) }, { label: "مأموریت‌های تکمیل‌شده", value: fa(a.summary.missions) }, { label: "پروژه‌ها", value: fa(a.summary.projects) }]} /></Block>
    </div>
  );
}

export async function ParentReports({ user, child, days }: { user: SessionUser; child?: string; days: number }) {
  const { kids, cur } = await pick(user, child);
  if (!cur) return <div className="panel__grid panel__grid--one"><LinkChild /></div>;
  const r = await childReport(user.id, cur.id, days);
  return (
    <div className="panel__grid">
      <Block title={`گزارش دوره‌ای ${cur.name}`} wide>
        <Picker kids={kids} cur={cur.id} base="/panel/parent/reports" />
        <nav className="chips-row" aria-label="بازه گزارش">{[7, 30, 90].map((d) => <Link key={d} className="pill" aria-pressed={d === days} href={`/panel/parent/reports?child=${cur.id}&days=${d}`}>{fa(d)} روز اخیر</Link>)}</nav>
        <Stats items={[{ label: "مأموریت‌های تکمیل‌شده", value: fa(r.completedMissions) }, { label: "میانگین نمره", value: fa(r.avgScore) }, { label: "امتیاز کسب‌شده", value: fa(r.pointsEarned) }, { label: "وضعیت مشارکت (حضور)", value: r.participation == null ? "—" : `${fa(r.participation)}٪` }]} />
      </Block>
      <Block title="مهارت‌های تقویت‌شده">{r.strengthened.length ? <Skills items={r.strengthened} /> : <Empty>—</Empty>}</Block>
      <Block title="دستاوردهای جدید">{r.newBadges.length ? <ul className="plist">{r.newBadges.map((b) => <li key={b.title}><b>{b.title}</b><small>{faDate(b.at)}</small></li>)}</ul> : <Empty>در این بازه نشان جدیدی نگرفته.</Empty>}</Block>
      <Block title="گزارش مهارتی" wide><Spark points={r.skills.trend.map((t) => t.score)} /></Block>
    </div>
  );
}
void Bar;
