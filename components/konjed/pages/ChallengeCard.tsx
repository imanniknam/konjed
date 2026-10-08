"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, toFa } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";

export type ChallengeItem = { id: string; title: string; description: string; skill: string; deadlineLabel: string | null; status: "upcoming" | "active" | "finished"; available: boolean; points: number; entered: boolean; reminder: boolean; kind: string };

/** One challenge: active ones take an answer, upcoming ones a reminder («یادآوری مسابقه»). */
export function ChallengeCard({ c }: { c: ChallengeItem }) {
  const me = useMe();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [entered, setEntered] = useState(c.entered);
  const [rem, setRem] = useState(c.reminder);
  const login = () => router.push(`/login?next=${encodeURIComponent("/showcase/challenges")}`);
  const available = c.available;

  async function enter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await api<{ points: number }>("POST", `/api/challenges/${c.id}/entries`, { text: String(new FormData(e.currentTarget).get("text")) });
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, t: res.error.message }); return; }
    setEntered(true); setOpen(false); setMsg({ ok: true, t: `پاسخت ثبت شد و ${toFa(res.data.points)} امتیاز گرفتی!` });
  }
  async function remind() {
    if (!me) return login();
    const res = await api<{ reminder: boolean }>("POST", `/api/challenges/${c.id}/reminder`);
    if (res.ok) setRem(res.data.reminder);
  }

  return (
    <article className="pcard2">
      <span className={`pcard2__status ${available ? "" : "pcard2__status--soon"}`}><i aria-hidden="true" />{available ? "فعال" : "به‌زودی"}</span>
      <h3>{c.kind === "contest" ? c.title : c.title}</h3>
      <p>{c.description}</p>
      <dl className="pcard2__meta"><div><dt>مهارت</dt><dd>{c.skill}</dd></div><div><dt>{available ? "مهلت ارسال" : "زمان برگزاری"}</dt><dd>{c.deadlineLabel ?? "به‌زودی"}</dd></div></dl>
      {available ? (
        entered ? <p className="status"><i aria-hidden="true" />در این چالش شرکت کردی</p>
        : open ? (
          <form onSubmit={enter} className="comment-form comment-form--col">
            <label className="sr-only" htmlFor={`ch-${c.id}`}>پاسخ چالش</label>
            <textarea id={`ch-${c.id}`} name="text" required minLength={5} rows={3} placeholder="ایده یا پاسخت رو بنویس..." />
            <button className="btn btn--primary btn--sm" disabled={busy}><span className="btn__label">{busy ? "..." : "ارسال"}</span></button>
          </form>
        ) : <button type="button" className="btn btn--ghost btn--sm" onClick={() => (me ? setOpen(true) : login())}><span className="btn__label">شرکت در چالش</span></button>
      ) : <button type="button" className="btn btn--ghost btn--sm" aria-pressed={rem} onClick={remind}><span className="btn__label">{rem ? "یادآوری فعال شد ✓" : "یادآوری مسابقه"}</span></button>}
      {msg && <p role="status" className={`form__status form__status--${msg.ok ? "ok" : "err"}`}>{msg.t}</p>}
    </article>
  );
}
