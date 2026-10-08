"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api, dateFa, toFa } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";

export type FeedProject = {
  id: string; title: string; description: string; skill: string | null; kindLabel: string; kind: string; group: string | null; coverUrl: string | null;
  likes: number; comments: number; author: string; liked: boolean; featured: boolean; createdAt: string;
};
type Detail = FeedProject & { commentList: { id: string; body: string; author: string; createdAt: string }[] };

const KINDS = [["all", "همه"], ["individual", "پروژه‌های فردی"], ["group", "پروژه‌های گروهی"], ["learning_experience", "تجربه‌های یادگیری"], ["idea", "ایده‌های خلاقانه"]] as const;
const GROUPS = [["all", "همه مهارت‌ها"], ["soft", "مهارت‌های نرم"], ["finance", "سواد مالی"], ["entrepreneurship", "کارآفرینی"]] as const;
const HUES: Record<string, string> = { individual: "#FFB400", group: "#5EE6A8", learning_experience: "#4CC2FF", idea: "#B58CFF" };
const ART: Record<string, string> = { individual: "/assets/konjed/rewards/coin.png", group: "/assets/konjed/rewards/backpack.png", learning_experience: "/assets/konjed/rewards/book.png", idea: "/assets/konjed/rewards/idea-bulb.png" };

export function ProjectFeed({ initial, id, title, text }: { initial: FeedProject[]; id?: string; title: string; text?: string }) {
  const me = useMe();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [group, setGroup] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "popular">("popular");
  const [open, setOpen] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => { if (open) dlg.current?.showModal(); }, [open]);

  const list = useMemo(() => {
    const n = (s: string) => s.replace(/[‌\s]+/g, "").toLowerCase();
    const r = items.filter((p) => (kind === "all" || p.kind === kind) && (group === "all" || p.group === group) && (!q.trim() || n(`${p.title}${p.skill ?? ""}${p.description}`).includes(n(q))));
    return [...r].sort((a, b) => (sort === "popular" ? b.likes - a.likes : b.createdAt.localeCompare(a.createdAt)));
  }, [items, q, kind, group, sort]);

  async function like(p: FeedProject) {
    if (!me) { router.push(`/login?next=${encodeURIComponent("/showcase/gallery")}`); return; }
    const res = await api<{ liked: boolean; likes: number }>("POST", `/api/projects/${p.id}/like`);
    if (res.ok) { setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, liked: res.data.liked, likes: res.data.likes } : x))); setOpen((o) => (o && o.id === p.id ? { ...o, liked: res.data.liked, likes: res.data.likes } : o)); }
  }
  async function view(p: FeedProject) {
    const res = await api<Detail>("GET", `/api/projects/${p.id}`);
    if (res.ok) setOpen(res.data);
  }
  async function comment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!open) return;
    if (!me) { router.push(`/login?next=${encodeURIComponent("/showcase/gallery")}`); return; }
    const form = e.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");
    const res = await api("POST", `/api/projects/${open.id}/comments`, { body });
    if (!res.ok) { setMsg(res.error.message); return; }
    setMsg(""); form.reset();
    const d = await api<Detail>("GET", `/api/projects/${open.id}`);
    if (d.ok) { setOpen(d.data); setItems((xs) => xs.map((x) => (x.id === open.id ? { ...x, comments: d.data.comments } : x))); }
  }

  return (
    <section className="pg-section" id={id} aria-labelledby={`${id}-t`}>
      <div className="pg-wrap">
        <div className="pg-head"><h2 id={`${id}-t`} className="h-display">{title}</h2>{text && <p className="lead">{text}</p>}</div>

        <div className="catalog__bar">
          <label className="search"><span className="sr-only">جست‌وجوی پروژه</span>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم پروژه، مهارت یا موضوع رو بنویس" /></label>
          <label className="select"><span>مرتب‌سازی:</span><select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "popular")}><option value="popular">محبوب‌ترین</option><option value="newest">جدیدترین</option></select></label>
        </div>
        <div className="chips-row" role="group" aria-label="نوع پروژه">{KINDS.map(([k, l]) => <button key={k} type="button" className="pill" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
        <div className="chips-row" role="group" aria-label="مهارت">{GROUPS.map(([k, l]) => <button key={k} type="button" className="pill" aria-pressed={group === k} onClick={() => setGroup(k)}>{l}</button>)}</div>

        {list.length === 0 ? (
          <div className="empty"><h3>پروژه‌ای پیدا نشد</h3><p>فیلتر دیگه‌ای امتحان کن. یا خودت اولین پروژه این دسته رو بساز!</p></div>
        ) : (
          <div className="grid" style={{ "--cols": 3 } as CSSProperties}>
            {list.map((p) => (
              <article key={p.id} className="gcard" style={{ "--hue": HUES[p.kind] } as CSSProperties}>
                <div className="gcard__art">
                  {p.coverUrl ? <img src={p.coverUrl} alt="" loading="lazy" className="gcard__cover" /> : <img src={ART[p.kind]} alt="" aria-hidden="true" loading="lazy" />}
                  <span className="pcard__tag">{p.kindLabel}</span>
                </div>
                <div className="gcard__body">
                  <h3>{p.title}</h3>
                  <p className="pcard__maker">ساخته‌شده توسط: <b>{p.author}</b>{p.skill && <> · مهارت: {p.skill}</>}</p>
                  <p className="gcard__text">{p.description.slice(0, 120)}{p.description.length > 120 ? "…" : ""}</p>
                  <div className="gcard__actions">
                    <button type="button" className="like" aria-pressed={p.liked} onClick={() => like(p)} aria-label={`${p.liked ? "برداشتن پسند" : "پسندیدن"} (${toFa(p.likes)} پسند)`}>
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.4 5c2 0 3.6 1.1 5.6 3.3C14 6.100 15.600 5 17.600 5 21 5 22.800 8.600 21.500 11.800 19.500 16.400 12 21 12 21z" fill={p.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                      {toFa(p.likes)}
                    </button>
                    <span className="gcard__count">{toFa(p.comments)} نظر</span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => view(p)}><span className="btn__label">مشاهده پروژه</span></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <dialog ref={dlg} className="modal" onClose={() => { setOpen(null); setMsg(""); }} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        {open && (
          <div className="modal__in">
            <button type="button" className="modal__x" aria-label="بستن" onClick={() => dlg.current?.close()}>✕</button>
            <p className="eyebrow">{open.kindLabel}{open.skill ? ` · ${open.skill}` : ""}</p>
            <h3>{open.title}</h3>
            <p className="pcard__maker">ساخته‌شده توسط: <b>{open.author}</b> · {dateFa(open.createdAt)}</p>
            {open.coverUrl && <img className="modal__cover" src={open.coverUrl} alt="" />}
            <p className="body-text">{open.description || "—"}</p>
            <button type="button" className="like" aria-pressed={open.liked} onClick={() => like(open)}>{open.liked ? "پسندیدی ♥" : "پسندیدن ♡"} · {toFa(open.likes)}</button>
            <h4>نظرها ({toFa(open.commentList.length)})</h4>
            <ul className="comments">{open.commentList.map((c) => <li key={c.id}><b>{c.author}</b><p>{c.body}</p></li>)}{open.commentList.length === 0 && <li className="muted">هنوز نظری ثبت نشده. اولین نفر باش!</li>}</ul>
            <form onSubmit={comment} className="comment-form">
              <label className="sr-only" htmlFor="cm">نظرت</label>
              <input id="cm" name="body" required minLength={2} placeholder="نظرت رو برای سازنده بنویس..." />
              <button className="btn btn--primary btn--sm"><span className="btn__label">ثبت نظر</span></button>
            </form>
            {msg && <p className="form__status form__status--err" role="alert">{msg}</p>}
          </div>
        )}
      </dialog>
    </section>
  );
}
