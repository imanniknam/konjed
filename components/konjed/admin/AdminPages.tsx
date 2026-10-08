import Link from "next/link";
import { count, eq, sql } from "drizzle-orm";
import { AdminDesk } from "../panel/admin";
import { ActionButton } from "../panel/clients";
import { Block, Empty, LinkBtn, Stats, fa, faDate } from "../panel/ui";
import { JsonEditor } from "./JsonEditor";
import { ResourceManager } from "./ResourceManager";
import { courseOptions, recentAudit, RESOURCES, listResource } from "@/lib/server/admin/resources";
import { listDocs } from "@/lib/server/cms";
import { db, schema } from "@/lib/server/db/client";

export const ADMIN_NAV: { group: string; items: [string, string][] }[] = [
  { group: "نمای کلی", items: [["", "میز کار"], ["inbox", "صندوق ورودی"], ["notifications", "اعلان‌ها"]] },
  { group: "محتوا (CMS)", items: [["content", "ویرایش متن صفحه‌ها"], ["courses", "دوره‌ها"], ["missions", "مأموریت‌ها"], ["games", "بازی‌ها"], ["badges", "نشان‌ها"], ["challenges", "چالش‌ها و مسابقات"], ["toolbox", "جعبه ابزار"]] },
  { group: "جامعه", items: [["projects", "پروژه‌های ویترین"], ["comments", "نظرها"], ["classes", "کلاس‌ها"], ["users", "کاربران"]] },
  { group: "سیستم", items: [["audit", "گزارش تغییرات"], ["settings", "پروفایل و تنظیمات"]] },
];

export async function AdminHome() {
  const n = async (t: any, where?: any) => Number((await db.select({ n: count() }).from(t).where(where))[0].n);
  const [students, coaches, parents, courses, games, plays, projects, enrollments, submissions, contacts, collabs] = await Promise.all([
    n(schema.users, eq(schema.users.role, "student")), n(schema.users, eq(schema.users.role, "coach")), n(schema.users, eq(schema.users.role, "parent")), n(schema.courses), n(schema.games), n(schema.gamePlays), n(schema.projects), n(schema.enrollments),
    n(schema.gameSubmissions, eq(schema.gameSubmissions.status, "received")), n(schema.contactMessages, eq(schema.contactMessages.status, "new")), n(schema.collabRequests, eq(schema.collabRequests.status, "new")),
  ]);
  const pending = await db.select({ id: schema.users.id, name: schema.users.displayName, email: schema.users.email, phone: schema.users.phone, at: schema.users.createdAt }).from(schema.users).where(sql`${schema.users.role} = 'coach' and not ${schema.users.approved}`);
  const [week] = await db.execute(sql`select count(*) filter (where created_at > now() - interval '7 days') as n from users`).then((r) => r.rows as { n: string }[]);
  const audit = (await recentAudit()).slice(0, 8);
  return (
    <div className="panel__grid">
      <Block title="نمای کلی" wide><Stats items={[{ label: "مهارت‌آموز", value: fa(students) }, { label: "مربی", value: fa(coaches) }, { label: "والدین", value: fa(parents) }, { label: "ثبت‌نام جدید ۷ روز اخیر", value: fa(Number(week.n)) }, { label: "ثبت‌نام در دوره", value: fa(enrollments) }, { label: "دوره", value: fa(courses) }, { label: "بازی", value: fa(games) }, { label: "بار بازی‌شدن", value: fa(plays) }, { label: "پروژه ویترین", value: fa(projects) }]} /></Block>
      <Block title="منتظر اقدام" wide>
        <ul className="plist">
          <li><b>درخواست انتشار بازی (جدید)</b><span>{fa(submissions)} <LinkBtn href="/panel/admin/inbox" variant="ghost">بررسی</LinkBtn></span></li>
          <li><b>پیام‌های تماس بدون پاسخ</b><span>{fa(contacts)} <LinkBtn href="/panel/admin/inbox" variant="ghost">بررسی</LinkBtn></span></li>
          <li><b>درخواست‌های همکاری جدید</b><span>{fa(collabs)} <LinkBtn href="/panel/admin/inbox" variant="ghost">بررسی</LinkBtn></span></li>
        </ul>
      </Block>
      <Block title="مربی‌های منتظر تأیید" wide>
        {pending.length ? <ul className="plist">{pending.map((c) => <li key={c.id}><div><b>{c.name}</b><p dir="ltr">{c.email ?? c.phone}</p></div><span className="row-actions"><ActionButton endpoint={`/api/admin/users/${c.id}`} method="PATCH" body={{ approved: true }} label="تأیید مربی" doneLabel="تأیید شد ✓" /></span></li>)}</ul> : <Empty>مربی منتظر تأییدی نیست.</Empty>}
      </Block>
      <Block title="آخرین تغییرات مدیریتی" wide action={<LinkBtn href="/panel/admin/audit" variant="ghost">همه</LinkBtn>}>
        {audit.length ? <ul className="plist">{audit.map((a) => <li key={a.id}><div><b>{ACTION[a.action] ?? a.action} · {RESOURCES[a.resource]?.title ?? a.resource}</b><p>{a.summary}</p></div><small>{a.user ?? "—"} · {faDate(a.at)}</small></li>)}</ul> : <Empty>هنوز تغییری ثبت نشده.</Empty>}
      </Block>
    </div>
  );
}
const ACTION: Record<string, string> = { create: "ساخت", update: "ویرایش", delete: "حذف" };

export async function AdminResource({ keyName }: { keyName: string }) {
  const def = RESOURCES[keyName];
  if (!def) return <Empty>این بخش وجود ندارد.</Empty>;
  const [rows, courses] = await Promise.all([listResource(keyName), keyName === "missions" ? courseOptions() : Promise.resolve([])]);
  const fields = def.fields.map((f) => (f.name === "courseId" ? { ...f, options: courses } : f));
  const hints: Record<string, string> = {
    missions: "مأموریت‌های هر دوره به ترتیب «مرحله» و «ترتیب» به مهارت‌آموز نشان داده می‌شود؛ هر مأموریت فقط بعد از انجام قبلی باز می‌شود.",
    users: "مربی‌های تازه‌ثبت‌نام‌شده تا «تأیید» نشوند به پنل مربی دسترسی ندارند. مسدودکردن، همه سشن‌های کاربر را قطع می‌کند.",
    projects: "پروژه‌ی «پنهان» در ویترین دیده نمی‌شود ولی پیش از حذف قابل بازگشت است.",
    badges: "قانون نشان اعلانی است؛ بعد از ذخیره، دفعه‌ی بعدی که کاربر فعالیتی انجام دهد بررسی می‌شود.",
  };
  return <div className="panel__grid panel__grid--one"><ResourceManager resource={keyName} title={def.title} fields={fields} rows={JSON.parse(JSON.stringify(rows))} canCreate={!!def.create} canRemove={!!def.remove} hint={hints[keyName]} /></div>;
}

export async function AdminContentList() {
  const docs = await listDocs();
  const groups: [string, typeof docs][] = [["سایت", docs.filter((d) => !d.key.startsWith("page:"))], ["صفحه‌ها", docs.filter((d) => d.key.startsWith("page:"))]];
  return (
    <div className="panel__grid panel__grid--one">
      {groups.map(([g, list]) => (
        <Block key={g} title={g} wide>
          <ul className="plist">{list.map((d) => <li key={d.key}><div><b>{d.label}</b><p dir="ltr">{d.key}</p></div><span className="row-actions">{d.customized ? <small>ویرایش‌شده · {faDate(d.updatedAt!)}</small> : <small className="muted">پیش‌فرض</small>}<LinkBtn href={`/panel/admin/content/edit?key=${encodeURIComponent(d.key)}`}>ویرایش</LinkBtn></span></li>)}</ul>
        </Block>
      ))}
    </div>
  );
}

export function AdminContentEditor({ docKey }: { docKey: string }) {
  const href = docKey === "home" || docKey === "chrome" ? "/" : `/${docKey.replace(/^page:/, "")}`;
  return (
    <div className="panel__grid panel__grid--one">
      <p><Link href="/panel/admin/content" className="muted">← همه سندها</Link></p>
      <JsonEditor docKey={docKey} publicHref={href} title={docKey === "home" ? "صفحه اصلی" : docKey === "chrome" ? "منو و فوتر" : `صفحه ${href}`} />
    </div>
  );
}

export async function AdminAudit() {
  const rows = await recentAudit();
  return <div className="panel__grid panel__grid--one"><Block title="گزارش تغییرات مدیریتی" wide>{rows.length ? <div className="tablewrap"><table className="ptable"><thead><tr><th>زمان</th><th>مدیر</th><th>عملیات</th><th>بخش</th><th>مورد</th></tr></thead><tbody>{rows.map((a) => <tr key={a.id}><td>{faDate(a.at)} {new Date(a.at).toLocaleTimeString("fa-IR")}</td><td>{a.user ?? "—"}</td><td>{ACTION[a.action] ?? a.action}</td><td>{RESOURCES[a.resource]?.title ?? a.resource}</td><td>{a.summary}</td></tr>)}</tbody></table></div> : <Empty>—</Empty>}</Block></div>;
}

export { AdminDesk };
