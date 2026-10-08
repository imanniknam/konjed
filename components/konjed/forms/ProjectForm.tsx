"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, upload } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";
import { KonjedButton } from "../KonjedButton";

const SKILLS = ["حل مسئله", "تصمیم‌گیری", "کار تیمی", "ارتباط مؤثر", "خلاقیت", "مدیریت زمان", "مدیریت پول", "پس‌انداز", "بودجه‌بندی", "ایده‌پردازی", "مدل کسب‌وکار", "کارآفرینی"];

/** Project submission for the showcase (students only); cover/file go through /api/uploads first. */
export function ProjectForm({ id, title }: { id?: string; title: string }) {
  const me = useMe();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true); setMsg(null); setErrs({});
    const payload: Record<string, unknown> = { title: fd.get("title"), desc: fd.get("desc") || undefined, skill: fd.get("skill") || undefined, type: fd.get("type") || undefined };
    for (const [field, key] of [["image", "coverUrl"], ["file", "fileUrl"]] as const) {
      const f = fd.get(field);
      if (f instanceof File && f.size > 0) {
        const up = await upload(f);
        if (!up.ok) { setBusy(false); setMsg({ ok: false, t: up.error.message }); return; }
        payload[key] = up.data.url;
      }
    }
    const res = await api("POST", "/api/projects", payload);
    setBusy(false);
    if (!res.ok) { setErrs(res.error.fields ?? {}); setMsg({ ok: false, t: res.error.message }); return; }
    setMsg({ ok: true, t: "پروژه‌ات توی ویترین منتشر شد! ۳۰ امتیاز و ۳ سکه گرفتی." });
    form.reset();
    router.refresh();
  }

  return (
    <section className="pg-section pg-section--form" id={id} aria-labelledby={`${id}-t`}>
      <div className="pg-wrap pg-wrap--narrow">
        <div className="pg-head"><h2 id={`${id}-t`} className="h-display">{title}</h2></div>
        {me === undefined ? null : !me || me.role !== "student" ? (
          <div className="form"><p className="lead">{!me ? "برای ثبت پروژه باید با حساب مهارت‌آموز وارد شده باشی." : "ثبت پروژه در ویترین مخصوص مهارت‌آموزهاست."}</p>{!me && <div className="actions"><KonjedButton href={`/login?next=${encodeURIComponent("/showcase/gallery#submit")}`}>ورود</KonjedButton><KonjedButton href="/signup" variant="secondary">ثبت‌نام</KonjedButton></div>}</div>
        ) : (
          <form className="form" onSubmit={onSubmit}>
            <div className="field"><label htmlFor="pf-title">عنوان پروژه <b aria-hidden="true">*</b></label><small>پروژه‌ات رو در چند کلمه معرفی کن.</small><input id="pf-title" name="title" required minLength={2} />{errs.title && <small className="field__err">{errs.title}</small>}</div>
            <div className="field"><label htmlFor="pf-desc">توضیح پروژه</label><small>بگو چه چیزی ساختی، چه مسئله‌ای رو حل کردی و چطور به این ایده رسیدی.</small><textarea id="pf-desc" name="desc" rows={4} /></div>
            <div className="field"><label htmlFor="pf-skill">مهارت اصلی</label><small>انتخاب کن این پروژه بیشتر مربوط به کدوم مهارته.</small><select id="pf-skill" name="skill" defaultValue=""><option value="" disabled>انتخاب کن</option>{SKILLS.map((s) => <option key={s}>{s}</option>)}</select></div>
            <fieldset className="field field--radio"><legend>نوع پروژه</legend><div className="chips-row">{["فردی", "گروهی", "تجربه یادگیری", "ایده خلاقانه"].map((o) => <label key={o} className="pill pill--radio"><input type="radio" name="type" value={o} /><span>{o}</span></label>)}</div></fieldset>
            <div className="field"><label htmlFor="pf-img">تصویر پروژه</label><small>یک تصویر از پروژه‌ات اضافه کن (png / jpg / webp، تا ۵ مگابایت).</small><input id="pf-img" name="image" type="file" accept="image/png,image/jpeg,image/webp" /></div>
            <div className="field"><label htmlFor="pf-file">فایل پروژه</label><small>در صورت نیاز فایل، ویدئو یا صوت پروژه‌ات رو اضافه کن (mp4 / webm / mp3 / m4a).</small><input id="pf-file" name="file" type="file" accept="video/mp4,video/webm,audio/mpeg,audio/mp4,audio/webm,audio/wav,image/png,image/jpeg,image/webp" /></div>
            <button className="btn btn--primary btn--lg" disabled={busy}><span className="btn__label">{busy ? "در حال ارسال..." : "ارسال پروژه"}</span></button>
            <p className={`form__status form__status--${msg?.ok ? "ok" : "err"}`} role="status" aria-live="polite">{msg?.t}</p>
          </form>
        )}
      </div>
    </section>
  );
}
