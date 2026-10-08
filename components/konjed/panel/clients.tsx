"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, toFa, upload } from "@/lib/client/api";
import { resetMe } from "@/lib/client/useMe";

/** Small button that calls an endpoint and refreshes the server-rendered page. */
export function ActionButton({ endpoint, method = "POST", body, label, doneLabel, className = "btn btn--ghost btn--sm", confirm, redirect }: { endpoint: string; method?: string; body?: unknown; label: string; doneLabel?: string; className?: string; confirm?: string; redirect?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  async function go() {
    if (confirm && !window.confirm(confirm)) return;
    setState("busy");
    const res = await api(method, endpoint, body);
    if (res.ok) { setState("done"); if (redirect) router.push(redirect); router.refresh(); } else { setState("err"); setErr(res.error.message); }
  }
  return (
    <span className="action">
      <button type="button" className={className} onClick={go} disabled={state === "busy" || (state === "done" && !!doneLabel)}><span className="btn__label">{state === "busy" ? "..." : state === "done" && doneLabel ? doneLabel : label}</span></button>
      {state === "err" && <small className="field__err" role="alert">{err}</small>}
    </span>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return <button type="button" className="btn btn--secondary btn--md" onClick={async () => { await api("POST", "/api/auth/logout"); resetMe(); router.push("/"); router.refresh(); }}><span className="btn__label">خروج از حساب</span></button>;
}

/** Mission answer: text + optional audio/video (uploaded first). Shows the evaluation that comes back. */
export function MissionSubmitForm({ missionId, reward }: { missionId: string; reward: { points: number; coins: number } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ score: number; feedback: string; points: number; coins: number } | null>(null);
  const [next, setNext] = useState<{ id: string; title: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    const payload: Record<string, unknown> = { text: fd.get("text") };
    const f = fd.get("media");
    if (f instanceof File && f.size > 0) {
      const up = await upload(f);
      if (!up.ok) { setBusy(false); setErr(up.error.message); return; }
      if (up.data.kind === "audio" || up.data.kind === "video") { payload.mediaUrl = up.data.url; payload.mediaKind = up.data.kind; }
    }
    const r = await api<{ score: number; feedback: string; points: number; coins: number }>("POST", `/api/missions/${missionId}/submit`, payload);
    setBusy(false);
    if (!r.ok) { setErr(r.error.fields?.text ?? r.error.message); return; }
    setRes(r.data);
    // celebrate first; offer the next step instead of silently swapping the page
    const m = await api<{ paths: { stages: { missions: { id: string; title: string; state: string }[] }[] }[] }>("GET", "/api/me/missions");
    if (m.ok) { const n = m.data.paths.flatMap((p) => p.stages.flatMap((s) => s.missions)).find((x) => x.state === "current"); if (n) setNext({ id: n.id, title: n.title }); }
  }
  if (res) return (
    <div className="evalcard" role="status">
      <p className="eyebrow">نتیجه ارزیابی</p>
      <p className="evalcard__score">{toFa(res.score)}<small>/۱۰۰</small></p>
      <p>{res.feedback}</p>
      <p className="status"><i aria-hidden="true" />+{toFa(res.points)} امتیاز و +{toFa(res.coins)} سکه گرفتی</p>
      <div className="row-actions">
        {next ? <button type="button" className="btn btn--primary btn--md" onClick={() => router.push(`/panel/student/missions/${next.id}`)}><span className="btn__label">مأموریت بعدی: {next.title}</span></button> : <button type="button" className="btn btn--primary btn--md" onClick={() => router.push("/games")}><span className="btn__label">رفتن به آرکید</span></button>}
        <button type="button" className="btn btn--ghost btn--md" onClick={() => { router.push("/panel/student/missions"); router.refresh(); }}><span className="btn__label">نقشه مأموریت‌ها</span></button>
      </div>
    </div>
  );
  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field"><label htmlFor="ms-text">خلاصه‌ی آموخته‌ها و پاسخ مأموریتت</label><small>با کمک هوش مصنوعی میزان تطابق پاسخت با محتوای جلسه بررسی می‌شه و مربی هم می‌تونه بازبینی کنه. حداقل ۱۰ نویسه.</small><textarea id="ms-text" name="text" rows={6} required minLength={10} /></div>
      <div className="field"><label htmlFor="ms-media">فایل صوتی یا ویدئو (اختیاری)</label><small>mp3 / m4a / wav یا mp4 / webm — تا ۵۰ مگابایت</small><input id="ms-media" name="media" type="file" accept="audio/*,video/mp4,video/webm,video/quicktime" /></div>
      <p className="muted">جایزه این مأموریت: تا {toFa(reward.points)} امتیاز و {toFa(reward.coins)} سکه</p>
      <button className="btn btn--primary btn--lg" disabled={busy}><span className="btn__label">{busy ? "در حال ارزیابی..." : "ارسال پاسخ"}</span></button>
      {err && <p className="form__status form__status--err" role="alert">{err}</p>}
    </form>
  );
}

export function ReviewForm({ id, aiScore }: { id: string; aiScore: number | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "adjust">("approve");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    const r = await api("PATCH", `/api/coach/evaluations/${id}`, { action: mode, score: mode === "adjust" ? Number(fd.get("score")) : undefined, feedback: fd.get("feedback") || undefined });
    setBusy(false);
    if (!r.ok) setErr(r.error.message); else router.refresh();
  }
  return (
    <form className="review" onSubmit={onSubmit}>
      <div className="chips-row" role="group" aria-label="نوع بازبینی">
        <button type="button" className="pill" aria-pressed={mode === "approve"} onClick={() => setMode("approve")}>تأیید ارزیابی هوش مصنوعی ({aiScore != null ? toFa(aiScore) : "—"})</button>
        <button type="button" className="pill" aria-pressed={mode === "adjust"} onClick={() => setMode("adjust")}>اصلاح امتیاز</button>
      </div>
      {mode === "adjust" && <div className="field"><label htmlFor={`sc-${id}`}>امتیاز نهایی (۰ تا ۱۰۰)</label><input id={`sc-${id}`} name="score" type="number" min={0} max={100} required defaultValue={aiScore ?? 70} /></div>}
      <div className="field"><label htmlFor={`fb-${id}`}>بازخورد برای مهارت‌آموز</label><textarea id={`fb-${id}`} name="feedback" rows={2} /></div>
      <button className="btn btn--primary btn--sm" disabled={busy}><span className="btn__label">{busy ? "..." : "ثبت بازبینی"}</span></button>
      {err && <small className="field__err" role="alert">{err}</small>}
    </form>
  );
}

export function AttendanceForm({ classId, students }: { classId: string; students: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const records = students.map((s) => ({ studentId: s.id, status: String(fd.get(`st-${s.id}`) ?? "present"), note: String(fd.get(`nt-${s.id}`) ?? "") || undefined }));
    const r = await api("POST", `/api/coach/classes/${classId}/attendance`, { title: fd.get("title"), records });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, t: r.error.message }); return; }
    setMsg({ ok: true, t: "حضور و غیاب ثبت شد." }); router.refresh();
  }
  if (!students.length) return <p className="pg-note">هنوز مهارت‌آموزی در این کلاس نیست.</p>;
  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field"><label htmlFor="att-title">عنوان جلسه</label><input id="att-title" name="title" required defaultValue={`جلسه ${new Date().toLocaleDateString("fa-IR")}`} /></div>
      <ul className="attlist">
        {students.map((s) => (
          <li key={s.id}>
            <b>{s.name}</b>
            <div className="chips-row">{[["present", "حاضر"], ["absent", "غایب"], ["late", "تأخیر"]].map(([v, l]) => <label key={v} className="pill pill--radio"><input type="radio" name={`st-${s.id}`} value={v} defaultChecked={v === "present"} /><span>{l}</span></label>)}</div>
            <input name={`nt-${s.id}`} placeholder="توضیح (اختیاری)" aria-label={`توضیح برای ${s.name}`} />
          </li>
        ))}
      </ul>
      <button className="btn btn--primary btn--lg" disabled={busy}><span className="btn__label">{busy ? "..." : "ثبت حضور و غیاب"}</span></button>
      {msg && <p role="status" className={`form__status form__status--${msg.ok ? "ok" : "err"}`}>{msg.t}</p>}
    </form>
  );
}

export function ActivateChallengeForm({ challengeId, classes }: { challengeId: string; classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const iso = (v: FormDataEntryValue | null) => (v ? new Date(String(v)).toISOString() : undefined);
    const r = await api<{ notified: number }>("POST", "/api/coach/challenges", { challengeId, classId: fd.get("classId"), startsAt: iso(fd.get("startsAt")), endsAt: iso(fd.get("endsAt")) });
    if (!r.ok) { setMsg({ ok: false, t: r.error.message }); return; }
    setMsg({ ok: true, t: `برای کلاس فعال شد و به ${toFa(r.data.notified)} مهارت‌آموز خبر دادیم.` }); router.refresh();
  }
  if (!classes.length) return <p className="muted">اول یک کلاس بساز.</p>;
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      <label>کلاس<select name="classId" required defaultValue="">{<option value="" disabled>انتخاب کن</option>}{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>شروع<input name="startsAt" type="date" dir="ltr" /></label>
      <label>پایان<input name="endsAt" type="date" dir="ltr" /></label>
      <button className="btn btn--primary btn--sm"><span className="btn__label">فعال‌سازی چالش</span></button>
      {msg && <p role="status" className={`form__status form__status--${msg.ok ? "ok" : "err"}`}>{msg.t}</p>}
    </form>
  );
}

export function AdminStatus({ kind, id, current, options }: { kind: "game" | "contact" | "collab"; id: string; current: string; options: [string, string][] }) {
  const router = useRouter();
  async function change(v: string) {
    const url = kind === "game" ? `/api/admin/game-submissions/${id}` : `/api/admin/inbox/${kind}/${id}`;
    await api("PATCH", url, { status: v });
    router.refresh();
  }
  return <select aria-label="وضعیت" defaultValue={current} onChange={(e) => change(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
