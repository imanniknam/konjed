import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiForm } from "../forms/ApiForm";
import { ActionButton, ActivateChallengeForm, AttendanceForm, ReviewForm } from "./clients";
import { Bar, Block, Empty, LinkBtn, Skills, Stats, fa, faDate } from "./ui";
import type { SessionUser } from "@/lib/server/auth/session";
import { addStudentToClass, attendanceReport, classDetail, classReport, coachDashboard, evaluationQueue, listClasses, unassignedStudents } from "@/lib/server/services/coach";
import { listCourses } from "@/lib/server/services/courses";
import { listChallenges, classChallengeResults } from "@/lib/server/services/challenges";

void addStudentToClass;

export async function CoachDashboard({ user }: { user: SessionUser }) {
  const d = await coachDashboard(user.id);
  return (
    <div className="panel__grid">
      <Block title="نمای کلی" wide>
        <Stats items={[{ label: "کلاس‌های فعال", value: fa(d.classes.length) }, { label: "تعداد مهارت‌آموزها", value: fa(d.totalStudents) }, { label: "نیازمند بررسی", value: fa(d.pendingReviews) }, { label: "چالش‌های فعال", value: fa(d.activeChallenges) }, { label: "مأموریت‌های فعال", value: fa(d.activeMissions) }, { label: "میانگین پیشرفت", value: `${fa(d.avgProgress)}٪` }]} />
        {d.pendingReviews > 0 && <LinkBtn href="/panel/coach/evaluations">{fa(d.pendingReviews)} خروجی منتظر بازبینی توئه</LinkBtn>}
      </Block>
      <Block title="کلاس‌های من" wide action={<LinkBtn href="/panel/coach/classes" variant="ghost">همه کلاس‌ها</LinkBtn>}>
        {d.classes.length ? <ul className="plist">{d.classes.map((c) => <li key={c.id}><div><b><Link href={`/panel/coach/classes/${c.id}`}>{c.name}</Link></b><p>{c.course} · {fa(c.students)} مهارت‌آموز{c.schedule ? ` · ${c.schedule}` : ""}</p></div><div className="plist__bar"><Bar value={c.avgProgress} label="میانگین پیشرفت" /><small>{fa(c.avgProgress)}٪</small></div></li>)}</ul> : <Empty>هنوز کلاسی نساخته‌ای.<br /><LinkBtn href="/panel/coach/classes">ساخت کلاس</LinkBtn></Empty>}
      </Block>
    </div>
  );
}

export async function CoachClasses({ user }: { user: SessionUser }) {
  const [classes, courses] = await Promise.all([listClasses(user.id), listCourses()]);
  return (
    <div className="panel__grid">
      <Block title="کلاس‌های من" wide>
        {classes.length ? <ul className="plist">{classes.map((c) => <li key={c.id}><div><b><Link href={`/panel/coach/classes/${c.id}`}>{c.name}</Link></b><p>دوره: {c.course} · {fa(c.students)} مهارت‌آموز · وضعیت: {c.status === "active" ? "فعال" : c.status}{c.schedule ? ` · زمان جلسات: ${c.schedule}` : ""}{c.lastActivity ? ` · آخرین فعالیت: ${faDate(c.lastActivity)}` : ""}</p></div><div className="plist__bar"><Bar value={c.avgProgress} /><small>{fa(c.avgProgress)}٪ میانگین پیشرفت</small></div></li>)}</ul> : <Empty>هنوز کلاسی نساخته‌ای.</Empty>}
      </Block>
      <Block title="ساخت کلاس جدید">
        <ApiForm endpoint="/api/coach/classes" submit="ساخت کلاس" success="کلاس ساخته شد." refresh fields={[
          { name: "courseId", label: "دوره", type: "select", required: true, options: courses.map((c) => `${c.id}|${c.title}`) },
          { name: "name", label: "نام کلاس", required: true }, { name: "schedule", label: "زمان جلسات", hint: "مثلاً جمعه‌ها ۱۷:۰۰" }]} />
      </Block>
    </div>
  );
}

export async function CoachClassDetail({ user, id }: { user: SessionUser; id: string }) {
  const [c, un] = await Promise.all([classDetail(user.id, id, user.role === "admin").catch(() => null), unassignedStudents(user.id, id, user.role === "admin").catch(() => [])]);
  if (!c) notFound();
  return (
    <div className="panel__grid panel__grid--one">
      <Block title={c.name} wide action={<span className="row-actions"><LinkBtn href={`/panel/coach/attendance/${c.id}`} variant="ghost">حضور و غیاب</LinkBtn><LinkBtn href={`/panel/coach/reports/${c.id}`} variant="ghost">گزارش کلاس</LinkBtn></span>}>
        {c.schedule && <p className="muted">زمان جلسات: {c.schedule}</p>}
        {c.students.length ? <div className="tablewrap"><table className="ptable"><thead><tr><th>مهارت‌آموز</th><th>پیشرفت</th><th>مأموریت انجام‌شده</th><th>انجام‌نشده</th><th>امتیاز</th><th>حضور</th></tr></thead>
          <tbody>{c.students.map((s) => <tr key={s.id}><th scope="row">{s.name}</th><td><Bar value={s.progress} /><small>{fa(s.progress)}٪</small></td><td>{fa(s.missionsDone)}</td><td>{fa(s.missionsLeft)}</td><td>{fa(s.points)}</td><td>{s.attendance == null ? "—" : `${fa(s.attendance)}٪`}</td></tr>)}</tbody></table></div> : <Empty>هنوز مهارت‌آموزی در این کلاس نیست.</Empty>}
      </Block>
      <Block title="ثبت‌نام‌شده‌های بدون کلاس" wide>
        {un.length ? <ul className="plist">{un.map((s) => <li key={s.id}><b>{s.name}</b><ActionButton endpoint={`/api/coach/classes/${id}/students`} body={{ studentId: s.id }} label="افزودن به کلاس" doneLabel="اضافه شد ✓" /></li>)}</ul> : <Empty>همه مهارت‌آموزهای ثبت‌نام‌شده در دوره، کلاس دارند.</Empty>}
      </Block>
    </div>
  );
}

export async function CoachAttendance({ user, id }: { user: SessionUser; id?: string }) {
  const classes = await listClasses(user.id);
  if (!id) return <div className="panel__grid panel__grid--one"><Block title="انتخاب کلاس" wide>{classes.length ? <ul className="plist">{classes.map((c) => <li key={c.id}><b>{c.name}</b><LinkBtn href={`/panel/coach/attendance/${c.id}`}>ثبت حضور و غیاب</LinkBtn></li>)}</ul> : <Empty>اول یک کلاس بساز.</Empty>}</Block></div>;
  const [c, hist] = await Promise.all([classDetail(user.id, id, user.role === "admin").catch(() => null), attendanceReport(user.id, id, user.role === "admin").catch(() => [])]);
  if (!c) notFound();
  return (
    <div className="panel__grid">
      <Block title={`جلسه جدید — ${c.name}`} wide><AttendanceForm classId={id} students={c.students.map((s) => ({ id: s.id, name: s.name }))} /></Block>
      <Block title="گزارش جلسات گذشته" wide>
        {hist.length ? <ul className="plist">{hist.map((h) => <li key={h.id}><div><b>{h.title}</b><p>{faDate(h.heldAt)}</p></div><small>حاضر {fa(h.present)} · تأخیر {fa(h.late)} · غایب {fa(h.absent)}</small></li>)}</ul> : <Empty>هنوز جلسه‌ای ثبت نشده.</Empty>}
      </Block>
    </div>
  );
}

export async function CoachEvaluations({ user }: { user: SessionUser }) {
  const items = await evaluationQueue(user.id, user.role === "admin");
  return (
    <div className="panel__grid panel__grid--one">
      {items.length ? items.map((i) => (
        <Block key={i.id} title={`${i.student} — ${i.mission}`} wide action={<span className={`subs__st subs__st--${i.review === "pending" ? "needs_info" : "approved"}`}>{i.review === "pending" ? "در انتظار بررسی مربی" : i.review === "approved" ? "تأیید شد" : "اصلاح شد"}</span>}>
          <p className="quote">{i.text}</p>
          {i.mediaUrl && <p><a href={i.mediaUrl} target="_blank" rel="noopener">مشاهده فایل پیوست</a></p>}
          <p><b>ارزیابی هوش مصنوعی: {fa(i.aiScore ?? 0)}/۱۰۰</b> — {i.aiFeedback}</p>
          {i.review === "pending" ? <ReviewForm id={i.id} aiScore={i.aiScore} /> : <p className="muted">امتیاز نهایی: {fa(i.coachScore ?? 0)}{i.coachFeedback ? ` — ${i.coachFeedback}` : ""}</p>}
        </Block>
      )) : <Block title="ارزیابی‌ها" wide><Empty>خروجی‌ای برای بررسی نیست.</Empty></Block>}
    </div>
  );
}

export async function CoachChallenges({ user }: { user: SessionUser }) {
  const [list, classes] = await Promise.all([listChallenges(), listClasses(user.id)]);
  const results = (await Promise.all(classes.map(async (c) => (await classChallengeResults(c.id)).map((r) => ({ ...r, cls: c.name }))))).flat();
  return (
    <div className="panel__grid panel__grid--one">
      {list.map((c) => (
        <Block key={c.id} title={c.title} wide action={<span className="muted">{c.status === "active" ? "فعال" : "به‌زودی"}</span>}>
          <p>{c.description}</p><p className="muted">مهارت هدف: {c.skill} · امتیاز: {fa(c.points)} · مهلت: {c.deadlineLabel ?? "—"}</p>
          <ActivateChallengeForm challengeId={c.id} classes={classes.map((x) => ({ id: x.id, name: x.name }))} />
        </Block>
      ))}
      <Block title="مشارکت و نتایج" wide>{results.length ? <ul className="plist">{results.map((r) => <li key={r.challengeId + r.cls}><div><b>{r.challenge}</b><p>{r.cls}</p></div><small>{fa(Number(r.participants))} مشارکت</small></li>)}</ul> : <Empty>هنوز چالشی برای کلاس‌هات فعال نکرده‌ای.</Empty>}</Block>
    </div>
  );
}

export async function CoachReports({ user, id }: { user: SessionUser; id?: string }) {
  if (!id) { const classes = await listClasses(user.id); return <div className="panel__grid panel__grid--one"><Block title="انتخاب کلاس" wide>{classes.length ? <ul className="plist">{classes.map((c) => <li key={c.id}><b>{c.name}</b><LinkBtn href={`/panel/coach/reports/${c.id}`}>مشاهده گزارش</LinkBtn></li>)}</ul> : <Empty>اول یک کلاس بساز.</Empty>}</Block></div>; }
  const r = await classReport(user.id, id, user.role === "admin").catch(() => null);
  if (!r) notFound();
  return (
    <div className="panel__grid">
      <Block title={`گزارش عملکرد — ${r.className}`} wide><Stats items={[{ label: "میانگین پیشرفت کلاس", value: `${fa(r.avgProgress)}٪` }, { label: "میزان مشارکت", value: `${fa(r.participation)}٪` }, { label: "مأموریت‌های تکمیل‌شده", value: fa(r.completedMissions) }]} /></Block>
      <Block title="عملکرد هر مهارت‌آموز" wide>{r.students.length ? <div className="tablewrap"><table className="ptable"><thead><tr><th>نام</th><th>پیشرفت</th><th>امتیاز</th><th>حضور</th></tr></thead><tbody>{r.students.map((s) => <tr key={s.id}><th scope="row">{s.name}</th><td>{fa(s.progress)}٪</td><td>{fa(s.points)}</td><td>{s.attendance == null ? "—" : `${fa(s.attendance)}٪`}</td></tr>)}</tbody></table></div> : <Empty>دانشجویی نیست.</Empty>}</Block>
      <Block title="وضعیت مهارت‌ها">{r.skills.length ? <Skills items={r.skills.map((s) => ({ skill: s.skill, score: s.avg }))} /> : <Empty>هنوز ارزیابی‌ای ثبت نشده.</Empty>}</Block>
      <Block title="حضور و غیاب">{r.attendance.length ? <ul className="plist">{r.attendance.map((h) => <li key={h.id}><b>{h.title}</b><small>حاضر {fa(h.present)} · غایب {fa(h.absent)}</small></li>)}</ul> : <Empty>جلسه‌ای ثبت نشده.</Empty>}</Block>
      <Block title="چالش‌های انجام‌شده">{r.challenges.length ? <ul className="plist">{r.challenges.map((c) => <li key={c.challengeId}><b>{c.challenge}</b><small>{fa(c.participants)} مشارکت</small></li>)}</ul> : <Empty>چالشی فعال نشده.</Empty>}</Block>
    </div>
  );
}
