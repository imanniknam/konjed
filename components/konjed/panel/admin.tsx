import { Block, Empty, Stats, fa, faDate } from "./ui";
import { AdminStatus, ActionButton } from "./clients";
import { STATUS_FA, adminInbox } from "@/lib/server/services/inbox";

const SUB: [string, string][] = Object.entries(STATUS_FA);
const INBOX: [string, string][] = [["new", "جدید"], ["in_progress", "در حال پیگیری"], ["done", "انجام شد"]];

/** Minimal Konjed-team desk: game submissions, contact messages, collaboration requests. */
export async function AdminDesk() {
  const { games, contacts, collabs } = await adminInbox();
  return (
    <div className="panel__grid panel__grid--one">
      <Block title="نمای کلی" wide><Stats items={[{ label: "درخواست انتشار بازی", value: fa(games.length) }, { label: "پیام‌های تماس", value: fa(contacts.length) }, { label: "درخواست‌های همکاری", value: fa(collabs.length) }]} /></Block>
      <Block title="درخواست‌های انتشار بازی" wide>
        {games.length ? <div className="tablewrap"><table className="ptable"><thead><tr><th>بازی</th><th>سازنده</th><th>مهارت</th><th>لینک</th><th>وضعیت</th><th /></tr></thead><tbody>{games.map((g) => <tr key={g.id}><th scope="row">{g.name}<small>{faDate(g.createdAt)}</small></th><td>{g.makerName ?? "—"}<small dir="ltr">{g.contact}</small></td><td>{g.mainSkill ?? "—"}</td><td dir="ltr">{g.link ? <a href={g.link} target="_blank" rel="noopener">باز کردن</a> : "—"}</td><td><AdminStatus kind="game" id={g.id} current={g.status} options={SUB} /></td><td>{g.status !== "published" && <ActionButton endpoint={`/api/admin/game-submissions/${g.id}/publish`} label="انتشار در آرکید" doneLabel="منتشر شد" confirm="این بازی در آرکید منتشر شود؟" />}</td></tr>)}</tbody></table></div> : <Empty>درخواستی نیست.</Empty>}
      </Block>
      <Block title="پیام‌های تماس" wide>{contacts.length ? <ul className="plist">{contacts.map((c) => <li key={c.id}><div><b>{c.name} · {c.subject ?? "—"}</b><p>{c.message}</p><small dir="ltr">{c.email ?? ""} {c.phone ?? ""}</small></div><AdminStatus kind="contact" id={c.id} current={c.status} options={INBOX} /></li>)}</ul> : <Empty>پیامی نیست.</Empty>}</Block>
      <Block title="درخواست‌های همکاری" wide>{collabs.length ? <ul className="plist">{collabs.map((c) => <li key={c.id}><div><b>{c.name} · {c.org ?? ""} · {c.type ?? ""}</b><p>{c.description}</p><small dir="ltr">{c.email ?? ""} {c.phone ?? ""} {c.link ?? ""}</small></div><AdminStatus kind="collab" id={c.id} current={c.status} options={INBOX} /></li>)}</ul> : <Empty>درخواستی نیست.</Empty>}</Block>
    </div>
  );
}
