import { eq } from "drizzle-orm";
import { ApiForm } from "../forms/ApiForm";
import { ActionButton, LogoutButton } from "./clients";
import { Block, Empty, faDate } from "./ui";
import { db, schema } from "@/lib/server/db/client";
import { notificationsFor } from "@/lib/server/services/dashboard";
import type { SessionUser } from "@/lib/server/auth/session";
import Link from "next/link";

export async function Notifications({ user }: { user: SessionUser }) {
  const { items, unread } = await notificationsFor(user.id);
  return (
    <div className="panel__grid panel__grid--one">
      <Block title={`اعلان‌ها${unread ? ` (${unread.toLocaleString("fa-IR")} خوانده‌نشده)` : ""}`} wide action={unread ? <ActionButton endpoint="/api/me/notifications" method="PATCH" label="علامت‌گذاری همه به‌عنوان خوانده‌شده" /> : undefined}>
        {items.length ? <ul className="plist">{items.map((n) => (
          <li key={n.id} data-unread={!n.readAt}>
            <div><b>{n.href ? <Link href={n.href}>{n.title}</Link> : n.title}</b>{n.body && <p>{n.body}</p>}</div>
            <small>{faDate(n.createdAt)}</small>
          </li>))}</ul> : <Empty>اعلان تازه‌ای نداری.</Empty>}
      </Block>
    </div>
  );
}

export async function Settings({ user }: { user: SessionUser }) {
  const [p] = user.role === "student" ? await db.select({ linkCode: schema.studentProfiles.linkCode }).from(schema.studentProfiles).where(eq(schema.studentProfiles.userId, user.id)) : [];
  const ROLE = { student: "مهارت‌آموز", coach: "مربی", parent: "والدین", admin: "مدیر" } as const;
  return (
    <div className="panel__grid">
      <Block title="اطلاعات حساب">
        <dl className="kv"><div><dt>نام</dt><dd>{user.displayName}</dd></div><div><dt>نقش کاربر</dt><dd>{ROLE[user.role]}</dd></div>{user.email && <div><dt>ایمیل</dt><dd dir="ltr">{user.email}</dd></div>}{user.phone && <div><dt>شماره تماس</dt><dd dir="ltr">{user.phone}</dd></div>}</dl>
        <ApiForm endpoint="/api/me/profile" method="PATCH" fields={[{ name: "displayName", label: "تغییر نام نمایشی" }]} submit="ذخیره" success="ذخیره شد." refresh reset={false} />
      </Block>
      {p && <Block title="کد اتصال والدین"><p>این کد رو به پدر یا مادرت بده تا از پنل والدین، به حساب تو وصل بشن و پیشرفتت رو ببینن.</p><p className="linkcode" dir="ltr">{p.linkCode}</p></Block>}
      <Block title="امنیت حساب">
        <ApiForm endpoint="/api/auth/password" fields={[{ name: "current", label: "رمز فعلی", type: "password", required: true }, { name: "next", label: "رمز جدید (حداقل ۸ نویسه)", type: "password", required: true }]} submit="تغییر رمز عبور" success="رمز عبور تغییر کرد." />
        <LogoutButton />
      </Block>
    </div>
  );
}
